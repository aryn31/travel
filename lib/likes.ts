import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "./db";
import { likes, stories } from "./db/schema";
import { notify } from "./notifications";

/**
 * Liking a story.
 *
 * `stories.like_count` has existed since the first migration and was never
 * written to. It stays, because every list on the site wants the number and
 * none of them want a join -- but it is treated as a cache of `likes`, not
 * as the truth.
 */

/**
 * Recomputes the cached count from the rows, rather than adding one.
 *
 * `like_count = like_count + 1` drifts: a double-submitted form, a retried
 * action, a row removed by a cascade, and the number is wrong forever with
 * nothing to notice it. Counting is a few microseconds against an indexed
 * column and it cannot be wrong.
 */
function recount(storyId: string) {
  return sql`(select count(*)::int from ${likes} where ${likes.storyId} = ${storyId})`;
}

export type LikeState = { liked: boolean; count: number };

/** Adds the like if it is missing, removes it if it is there. */
export async function toggleLike(
  storyId: string,
  userId: string,
): Promise<LikeState> {
  const state = await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ userId: likes.userId })
      .from(likes)
      .where(and(eq(likes.storyId, storyId), eq(likes.userId, userId)))
      .limit(1);

    if (existing) {
      await tx
        .delete(likes)
        .where(and(eq(likes.storyId, storyId), eq(likes.userId, userId)));
    } else {
      /*
       * Two tabs, two clicks, one winner. The composite primary key makes
       * the second insert a constraint violation rather than a second like,
       * and ignoring it is the correct response -- the row it wanted to
       * create already exists.
       */
      await tx.insert(likes).values({ storyId, userId }).onConflictDoNothing();
    }

    const [row] = await tx
      .update(stories)
      .set({ likeCount: recount(storyId) })
      .where(eq(stories.id, storyId))
      .returning({ count: stories.likeCount });

    const [owner] = await tx
      .select({ authorId: stories.authorId })
      .from(stories)
      .where(eq(stories.id, storyId))
      .limit(1);

    return { liked: !existing, count: row?.count ?? 0, authorId: owner?.authorId };
  });

  /*
   * After the transaction, not inside it. The like is the thing that has
   * to be durable; telling someone about it is a side effect, and holding
   * a database transaction open across an insert nobody is waiting for is
   * how a fast action becomes a slow one.
   *
   * Only on the way up. Unliking is not news.
   */
  if (state.liked && state.authorId) {
    await notify({
      userId: state.authorId,
      actorId: userId,
      kind: "like",
      storyId,
    });
  }

  return { liked: state.liked, count: state.count };
}

/** Whether this viewer has liked this story. */
export async function hasLiked(
  storyId: string,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const [row] = await db
    .select({ userId: likes.userId })
    .from(likes)
    .where(and(eq(likes.storyId, storyId), eq(likes.userId, userId)))
    .limit(1);
  return Boolean(row);
}

/**
 * Which of these stories the viewer has liked, in one query.
 *
 * A list of twelve results should not be twelve round trips, and the caller
 * only ever needs set membership.
 */
export async function likedAmong(
  storyIds: string[],
  userId: string | null,
): Promise<Set<string>> {
  if (!userId || storyIds.length === 0) return new Set();
  const rows = await db
    .select({ storyId: likes.storyId })
    .from(likes)
    .where(and(eq(likes.userId, userId), inArray(likes.storyId, storyIds)));
  return new Set(rows.map((r) => r.storyId));
}
