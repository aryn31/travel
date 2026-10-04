import "server-only";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  collections,
  collectionStories,
  media,
  profiles,
  saves,
  stories,
} from "./db/schema";
import { publicUrl } from "./storage";
import { isReadable } from "./visibility";
import type { CollectionCard } from "./collections";
import type { StoryCard } from "@/components/StoryList";

/**
 * Reading list.
 *
 * Nothing here is ever shown to anyone but the person who saved it. There
 * is no count on a story and no "47 people saved this" -- a like is a
 * public signal to the writer, a save is a private note, and a save that
 * is secretly public is a reason not to use either.
 */

export type SaveTarget =
  | { kind: "story"; id: string }
  | { kind: "collection"; id: string };

/** Narrows a target to the column it lives in. */
function column(target: SaveTarget) {
  return target.kind === "story"
    ? eq(saves.storyId, target.id)
    : eq(saves.collectionId, target.id);
}

export type SaveState = { saved: boolean };

/** Saves it if it is not saved, unsaves it if it is. */
export async function toggleSave(
  target: SaveTarget,
  userId: string,
): Promise<SaveState> {
  const [existing] = await db
    .select({ id: saves.id })
    .from(saves)
    .where(and(eq(saves.userId, userId), column(target)))
    .limit(1);

  if (existing) {
    await db.delete(saves).where(eq(saves.id, existing.id));
    return { saved: false };
  }

  await db
    .insert(saves)
    .values({
      userId,
      storyId: target.kind === "story" ? target.id : null,
      collectionId: target.kind === "collection" ? target.id : null,
    })
    // Two tabs, two clicks: the unique index makes the loser a no-op
    // rather than a second row.
    .onConflictDoNothing();

  return { saved: true };
}

export async function isSaved(
  target: SaveTarget,
  userId: string | null,
): Promise<boolean> {
  if (!userId) return false;
  const [row] = await db
    .select({ id: saves.id })
    .from(saves)
    .where(and(eq(saves.userId, userId), column(target)))
    .limit(1);
  return Boolean(row);
}

export type SavedShelf = {
  stories: (StoryCard & { savedAt: Date })[];
  trips: (CollectionCard & { savedAt: Date })[];
  /**
   * Saves whose target is no longer readable -- taken down, made private,
   * or unpublished since. Counted rather than listed: a dead row is not
   * worth a line, but silently losing something you saved is worse.
   */
  gone: number;
};

/**
 * Everything this person has saved, newest first.
 *
 * Unreadable targets are dropped rather than shown: they would 404 on
 * click, and a reading list full of dead entries is not a reading list.
 */
export async function savedShelf(userId: string): Promise<SavedShelf> {
  const rows = await db
    .select({
      id: saves.id,
      storyId: saves.storyId,
      collectionId: saves.collectionId,
      savedAt: saves.createdAt,
    })
    .from(saves)
    .where(eq(saves.userId, userId))
    .orderBy(desc(saves.createdAt));

  const storyIds = rows.map((r) => r.storyId).filter(Boolean) as string[];
  const tripIds = rows.map((r) => r.collectionId).filter(Boolean) as string[];

  const savedAt = new Map(
    rows.map((r) => [r.storyId ?? r.collectionId!, r.savedAt]),
  );

  const [storyRows, tripRows] = await Promise.all([
    storyIds.length > 0
      ? db
          .select({
            id: stories.id,
            slug: stories.slug,
            title: stories.title,
            excerpt: stories.excerpt,
            bodyText: stories.bodyText,
            readingMinutes: stories.readingMinutes,
            publishedAt: stories.publishedAt,
            placeName: stories.placeName,
            countryCode: stories.countryCode,
            status: stories.status,
            handle: profiles.handle,
            displayName: profiles.displayName,
            avatarKey: profiles.avatarKey,
            coverKey: media.storageKey,
            coverWidth: media.width,
            coverHeight: media.height,
          })
          .from(stories)
          .innerJoin(profiles, eq(profiles.userId, stories.authorId))
          .leftJoin(media, eq(media.id, stories.coverMediaId))
          .where(and(inArray(stories.id, storyIds), isNull(stories.removedAt)))
      : [],
    tripIds.length > 0
      ? db
          .select({
            id: collections.id,
            slug: collections.slug,
            title: collections.title,
            description: collections.description,
            status: collections.status,
            updatedAt: collections.updatedAt,
            handle: profiles.handle,
          })
          .from(collections)
          .innerJoin(profiles, eq(profiles.userId, collections.ownerId))
          .where(inArray(collections.id, tripIds))
      : [],
  ]);

  const keptStories = storyRows.filter((r) => isReadable(r.status));
  const keptTrips = tripRows.filter((r) => isReadable(r.status));

  /* Each trip's parts, counted in one query rather than one per trip. */
  const parts =
    keptTrips.length > 0
      ? await db
          .select({
            collectionId: collectionStories.collectionId,
            readingMinutes: stories.readingMinutes,
            countryCode: stories.countryCode,
            status: stories.status,
            removedAt: stories.removedAt,
            coverKey: media.storageKey,
            coverWidth: media.width,
            coverHeight: media.height,
          })
          .from(collectionStories)
          .innerJoin(stories, eq(stories.id, collectionStories.storyId))
          .leftJoin(media, eq(media.id, stories.coverMediaId))
          .where(
            inArray(collectionStories.collectionId, keptTrips.map((t) => t.id)),
          )
          .orderBy(collectionStories.position)
      : [];

  const trips = keptTrips.map((t) => {
    const mine = parts.filter(
      (p) => p.collectionId === t.id && isReadable(p.status) && !p.removedAt,
    );
    const withCover = mine.find((p) => p.coverKey);
    return {
      id: t.id,
      slug: t.slug,
      href: `/@${t.handle}/trips/${t.slug}`,
      title: t.title,
      description: t.description,
      status: t.status,
      storyCount: mine.length,
      cover: withCover
        ? {
            url: publicUrl(withCover.coverKey!),
            width: withCover.coverWidth!,
            height: withCover.coverHeight!,
          }
        : null,
      countries: [
        ...new Set(mine.map((p) => p.countryCode).filter(Boolean)),
      ] as string[],
      minutes: mine.reduce((n, p) => n + p.readingMinutes, 0),
      updatedAt: t.updatedAt,
      savedAt: savedAt.get(t.id)!,
    };
  });

  const storyCards = keptStories.map((r) => ({
    ...r,
    cover: r.coverKey
      ? { url: publicUrl(r.coverKey), width: r.coverWidth!, height: r.coverHeight! }
      : null,
    savedAt: savedAt.get(r.id)!,
  }));

  // Newest save first, across both kinds.
  storyCards.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());
  trips.sort((a, b) => b.savedAt.getTime() - a.savedAt.getTime());

  return {
    stories: storyCards,
    trips,
    gone: rows.length - storyCards.length - trips.length,
  };
}

/** How many are waiting, for the nav. */
export async function savedCount(userId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(saves)
    .where(eq(saves.userId, userId));
  return row?.n ?? 0;
}
