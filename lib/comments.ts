import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { comments, profiles, stories } from "./db/schema";

/**
 * Comments, one level deep.
 *
 * The depth limit is the whole design. Unbounded nesting turns a
 * conversation into a diagram, needs collapse controls, and on a phone runs
 * out of horizontal room by the third reply. One level is a comment and the
 * replies to it, which is what almost every thread actually is.
 */

export { MAX_BODY } from "./comments-rules";
import { MAX_BODY } from "./comments-rules";

export type { CommentAuthor, CommentNode } from "./comments-types";
import type { CommentNode } from "./comments-types";

/** Trims and bounds what someone typed. Null means "do not store this". */
export function cleanBody(raw: string): string | null {
  const body = raw.trim().replace(/\n{3,}/g, "\n\n");
  if (!body) return null;
  return body.slice(0, MAX_BODY);
}

/**
 * Every comment on a story, as roots with their replies.
 *
 * One query and a grouping pass rather than a query per root: a story with
 * forty comments would otherwise be forty-one round trips to build one
 * page.
 */
export async function listComments(
  storyId: string,
  viewerId: string | null,
): Promise<CommentNode[]> {
  const [story] = await db
    .select({ authorId: stories.authorId })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);

  const rows = await db
    .select({
      id: comments.id,
      parentId: comments.parentId,
      body: comments.body,
      createdAt: comments.createdAt,
      deletedAt: comments.deletedAt,
      authorId: comments.authorId,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarKey: profiles.avatarKey,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.authorId))
    .where(eq(comments.storyId, storyId))
    .orderBy(asc(comments.createdAt));

  /*
   * A story's author can remove anything on their own story; everyone else
   * can remove only their own. There is no report queue yet, so the author
   * is the moderator.
   */
  const ownsStory = Boolean(viewerId && story && story.authorId === viewerId);

  const node = (r: (typeof rows)[number]): CommentNode => ({
    id: r.id,
    body: r.deletedAt ? "" : r.body,
    createdAt: r.createdAt,
    author: r.deletedAt
      ? null
      : { handle: r.handle, displayName: r.displayName, avatarKey: r.avatarKey },
    deleted: Boolean(r.deletedAt),
    canDelete:
      !r.deletedAt && Boolean(viewerId) && (ownsStory || r.authorId === viewerId),
    replies: [],
  });

  const byId = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];

  for (const r of rows) {
    byId.set(r.id, node(r));
  }
  for (const r of rows) {
    const self = byId.get(r.id)!;
    const parent = r.parentId ? byId.get(r.parentId) : null;
    if (parent) parent.replies.push(self);
    else roots.push(self);
  }

  /*
   * A removed comment with no replies is just a gap. One that still holds
   * replies has to stay, or the replies become answers to nothing.
   */
  return roots.filter((c) => !c.deleted || c.replies.length > 0);
}

/**
 * Stores a comment and refreshes the story's cached count.
 *
 * Returns null if the story does not exist or is not published -- a draft
 * has no readers, so a comment on one arrived by guessing an id.
 */
export async function addComment({
  storyId,
  authorId,
  body,
  parentId,
}: {
  storyId: string;
  authorId: string;
  body: string;
  parentId?: string | null;
}): Promise<string | null> {
  const [story] = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.status, "published")))
    .limit(1);
  if (!story) return null;

  /*
   * Replies to replies are reparented onto the thread's root. The column
   * cannot express a depth limit, and rejecting the reply would be a worse
   * answer than quietly putting it where it belongs -- the person replying
   * meant "in this thread" either way.
   *
   * The parent is also checked to be on this story, so a crafted id cannot
   * graft a comment from one story onto another.
   */
  let root: string | null = null;
  if (parentId) {
    const [parent] = await db
      .select({ id: comments.id, parentId: comments.parentId })
      .from(comments)
      .where(
        and(
          eq(comments.id, parentId),
          eq(comments.storyId, storyId),
          isNull(comments.deletedAt),
        ),
      )
      .limit(1);
    if (!parent) return null;
    root = parent.parentId ?? parent.id;
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(comments)
      .values({ storyId, authorId, body, parentId: root })
      .returning({ id: comments.id });

    await tx
      .update(stories)
      .set({ commentCount: liveCount(storyId) })
      .where(eq(stories.id, storyId));

    return row.id;
  });
}

/**
 * Removes a comment, if this viewer is allowed to.
 *
 * Soft: the row stays so replies keep their place and so there is something
 * to look at if the removal is ever questioned.
 */
export async function deleteComment(
  commentId: string,
  viewerId: string,
): Promise<boolean> {
  const [row] = await db
    .select({
      id: comments.id,
      storyId: comments.storyId,
      authorId: comments.authorId,
      storyAuthorId: stories.authorId,
      deletedAt: comments.deletedAt,
    })
    .from(comments)
    .innerJoin(stories, eq(stories.id, comments.storyId))
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!row || row.deletedAt) return false;
  if (row.authorId !== viewerId && row.storyAuthorId !== viewerId) return false;

  await db.transaction(async (tx) => {
    await tx
      .update(comments)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(comments.id, commentId));

    await tx
      .update(stories)
      .set({ commentCount: liveCount(row.storyId) })
      .where(eq(stories.id, row.storyId));
  });

  return true;
}

/** The count as the comments table sees it, removals excluded. */
function liveCount(storyId: string) {
  return sql`(select count(*)::int from ${comments}
              where ${comments.storyId} = ${storyId}
                and ${comments.deletedAt} is null)`;
}
