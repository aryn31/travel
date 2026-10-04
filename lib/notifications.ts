import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  collections,
  comments,
  notifications,
  profiles,
  stories,
} from "./db/schema";

/**
 * Telling a writer what happened while they were not looking.
 *
 * In-app only. Nothing here sends email: an unread dot is something you
 * find when you come back, and a message in someone's inbox is an
 * interruption they did not ask for. The site has one mailbox-worthy
 * event -- resetting a password -- and this is not it.
 *
 * Nothing here ever throws. A notification is a side effect of an action
 * the person already completed, and failing their comment because of a
 * bookkeeping insert would be absurd.
 */

export type Kind = "like" | "comment" | "reply" | "removed" | "restored";

type Event = {
  /** Who is being told. */
  userId: string;
  /** Who did it. */
  actorId: string;
  kind: Kind;
  storyId?: string | null;
  commentId?: string | null;
  collectionId?: string | null;
};

/**
 * Records one.
 *
 * Returns silently when the actor is the recipient: liking your own story
 * or replying to yourself is allowed, and being told about it is not a
 * feature.
 */
export async function notify(event: Event): Promise<void> {
  /*
   * Except for a moderator acting on their own work, where the whole
   * point is that the author is told. They already know -- they did it --
   * so there is still nothing to say.
   */
  if (event.userId === event.actorId) return;

  try {
    const [row] = await db
      .insert(notifications)
      .values({
        userId: event.userId,
        actorId: event.actorId,
        kind: event.kind,
        storyId: event.storyId ?? null,
        commentId: event.commentId ?? null,
        collectionId: event.collectionId ?? null,
      })
      /*
       * The partial unique index catches a re-like. Doing nothing is right:
       * they were already told the first time, and the row they would have
       * created says exactly the same thing.
       */
      .onConflictDoNothing()
      .returning({ id: notifications.id });

    // Nothing inserted means nothing new to say.
    if (!row) return;
  } catch (error) {
    // Logged, never raised -- see the note at the top of this module.
    console.error("[notify] failed", error);
  }
}

export type Item = {
  id: string;
  kind: Kind;
  createdAt: Date;
  read: boolean;
  actor: { name: string; handle: string; avatarKey: string | null } | null;
  story: { title: string; href: string } | null;
  /** The comment text, for a comment or reply. */
  excerpt: string | null;
};

/** The list, newest first. */
export async function listFor(userId: string, limit = 50): Promise<Item[]> {
  const rows = await db
    .select({
      id: notifications.id,
      kind: notifications.kind,
      createdAt: notifications.createdAt,
      readAt: notifications.readAt,
      actorName: profiles.displayName,
      actorHandle: profiles.handle,
      actorAvatar: profiles.avatarKey,
      storyTitle: stories.title,
      storySlug: stories.slug,
      storyAuthor: stories.authorId,
      tripTitle: collections.title,
      tripSlug: collections.slug,
      tripOwner: collections.ownerId,
      body: comments.body,
      commentDeleted: comments.deletedAt,
    })
    .from(notifications)
    .leftJoin(profiles, eq(profiles.userId, notifications.actorId))
    .leftJoin(stories, eq(stories.id, notifications.storyId))
    .leftJoin(comments, eq(comments.id, notifications.commentId))
    .leftJoin(collections, eq(collections.id, notifications.collectionId))
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);

  /*
   * Whose story it is, looked up rather than assumed.
   *
   * A comment lands on the recipient's own story, so their handle would
   * do -- but a *reply* happens wherever the conversation is, which is
   * usually somebody else's page. Building the URL from the recipient
   * produced a link that 404s.
   *
   * A second query rather than a second join on `profiles`: the actor is
   * already joined there, and two aliases of the same table for one
   * column is not worth the hand-written SQL.
   */
  const authorIds = [
    ...new Set(
      rows.flatMap((r) => [r.storyAuthor, r.tripOwner]).filter(Boolean),
    ),
  ] as string[];
  const handles = new Map<string, string>();
  if (authorIds.length > 0) {
    for (const a of await db
      .select({ userId: profiles.userId, handle: profiles.handle })
      .from(profiles)
      .where(inArray(profiles.userId, authorIds))) {
      handles.set(a.userId, a.handle);
    }
  }

  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    createdAt: r.createdAt,
    read: Boolean(r.readAt),
    /*
     * A removal never names the moderator who made it.
     *
     * The row records who, because a decision nobody is accountable for
     * is not a decision -- but telling an author exactly which person
     * took their story down invites them to go and argue with that
     * person, which is what the contact form is for.
     */
    actor:
      r.actorHandle && r.kind !== "removed" && r.kind !== "restored"
        ? {
            name: r.actorName ?? r.actorHandle,
            handle: r.actorHandle,
            avatarKey: r.actorAvatar,
          }
        : null,
    story:
      r.storySlug && r.storyAuthor && handles.has(r.storyAuthor)
        ? {
            title: r.storyTitle || "Untitled",
            href: `/@${handles.get(r.storyAuthor)}/${r.storySlug}`,
          }
        : r.tripSlug && r.tripOwner && handles.has(r.tripOwner)
          ? {
              title: r.tripTitle || "Untitled trip",
              href: `/@${handles.get(r.tripOwner)}/trips/${r.tripSlug}`,
            }
          : null,
    // A removed comment keeps its notification but loses its text.
    excerpt: r.commentDeleted ? null : (r.body?.slice(0, 160) ?? null),
  }));
}

export async function unreadCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
  return row?.n ?? 0;
}

/**
 * Marks everything read.
 *
 * All at once rather than per item: these are told-you-so lines, not a
 * task list, and asking someone to dismiss fourteen of them one by one is
 * a chore invented by the software.
 */
export async function markAllRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(
      and(eq(notifications.userId, userId), isNull(notifications.readAt)),
    );
}
