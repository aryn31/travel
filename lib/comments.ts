import { and, asc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { comments, profiles, reports, stories, users } from "./db/schema";
import { notify } from "./notifications";

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
      role: users.role,
    })
    .from(comments)
    .innerJoin(profiles, eq(profiles.userId, comments.authorId))
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.storyId, storyId))
    .orderBy(asc(comments.createdAt));

  /*
   * A story's author can remove anything on their own story; everyone else
   * can remove only their own. There is no report queue yet, so the author
   * is the moderator.
   */
  const ownsStory = Boolean(viewerId && story && story.authorId === viewerId);

  /*
   * Which of these the viewer has already reported, in one query. Asking
   * per comment would be a round trip each, and the answer only changes
   * what a button says.
   */
  const reportedIds = new Set<string>();
  if (viewerId && rows.length > 0) {
    const mine = await db
      .select({ commentId: reports.commentId })
      .from(reports)
      .where(
        and(
          eq(reports.reporterId, viewerId),
          inArray(reports.commentId, rows.map((r) => r.id)),
        ),
      );
    for (const m of mine) if (m.commentId) reportedIds.add(m.commentId);
  }

  const node = (r: (typeof rows)[number]): CommentNode => ({
    id: r.id,
    body: r.deletedAt ? "" : r.body,
    createdAt: r.createdAt,
    author: r.deletedAt
      ? null
      : {
          handle: r.handle,
          displayName: r.displayName,
          avatarKey: r.avatarKey,
          role: r.role,
        },
    deleted: Boolean(r.deletedAt),
    canDelete:
      !r.deletedAt && Boolean(viewerId) && (ownsStory || r.authorId === viewerId),
    mine: r.authorId === viewerId,
    reported: reportedIds.has(r.id),
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
 * Returns null if the story is not one anyone else can reach.
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
  /*
   * Unlisted counts: someone holding the link can read it, so they can
   * reply to it. Drafts and private stories have no audience but their
   * author, so a comment on one arrived by guessing an id.
   */
  const [story] = await db
    .select({ id: stories.id, authorId: stories.authorId })
    .from(stories)
    .where(
      and(
        eq(stories.id, storyId),
        inArray(stories.status, ["published", "unlisted"]),
        // A removed story takes its comment box with it.
        isNull(stories.removedAt),
      ),
    )
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
  let repliedTo: string | null = null;
  if (parentId) {
    const [parent] = await db
      .select({
        id: comments.id,
        parentId: comments.parentId,
        authorId: comments.authorId,
      })
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
    repliedTo = parent.authorId;
  }

  const id = await db.transaction(async (tx) => {
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

  /*
   * Two people can care about one comment: whoever wrote the story, and
   * whoever is being replied to. Both are told, and notify() drops the
   * case where they are the same person as the commenter.
   *
   * Told once, not twice: an author replying to a comment on their own
   * story would otherwise get a reply notification and a comment one for
   * the same sentence.
   */
  await notify({
    userId: story.authorId,
    actorId: authorId,
    kind: "comment",
    storyId,
    commentId: id,
  });

  if (repliedTo && repliedTo !== story.authorId) {
    await notify({
      userId: repliedTo,
      actorId: authorId,
      kind: "reply",
      storyId,
      commentId: id,
    });
  }

  return id;
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
