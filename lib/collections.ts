import "server-only";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  collections,
  collectionStories,
  media,
  profiles,
  stories,
} from "./db/schema";
import { publicUrl } from "./storage";
import { slugify, uniqueSlug } from "./slug";
import { isReadable, type Visibility } from "./visibility";
import type { StoryCard } from "@/components/StoryList";

/**
 * Trips: an ordered run of stories under one title.
 *
 * Everything here is scoped by owner on the way in. A collection is a list
 * of someone else's work waiting to happen -- the one rule that matters is
 * that you can only put your own stories in your own collection.
 */

export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 600;

export type CollectionCard = {
  id: string;
  slug: string;
  /** Where it lives. Built here so no caller has to remember "trips". */
  href: string;
  title: string;
  description: string | null;
  status: Visibility;
  /** Stories anyone can read. The owner's own view counts differently. */
  storyCount: number;
  /** Borrowed from the first story -- a collection has no cover of its own. */
  cover: { url: string; width: number; height: number } | null;
  countries: string[];
  minutes: number;
  updatedAt: Date;
};

/** A story as it appears inside a collection, with its place in the order. */
export type CollectionEntry = StoryCard & {
  position: number;
  status: Visibility;
  removed: boolean;
};

/* ------------------------------------------------------------------ *
 * Reading
 * ------------------------------------------------------------------ */

/**
 * The stories in a collection, in order.
 *
 * `includeHidden` is the owner's view: their own drafts and private
 * pieces are part of the trip even before anyone else can read them, and
 * hiding them from the person arranging the order would be absurd.
 */
export async function entriesOf(
  collectionId: string,
  includeHidden: boolean,
): Promise<CollectionEntry[]> {
  const rows = await db
    .select({
      position: collectionStories.position,
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
      removedAt: stories.removedAt,
      handle: profiles.handle,
      displayName: profiles.displayName,
      avatarKey: profiles.avatarKey,
      coverKey: media.storageKey,
      coverWidth: media.width,
      coverHeight: media.height,
    })
    .from(collectionStories)
    .innerJoin(stories, eq(stories.id, collectionStories.storyId))
    .innerJoin(profiles, eq(profiles.userId, stories.authorId))
    .leftJoin(media, eq(media.id, stories.coverMediaId))
    .where(eq(collectionStories.collectionId, collectionId))
    .orderBy(asc(collectionStories.position), asc(stories.publishedAt));

  return rows
    .filter((r) =>
      includeHidden ? true : isReadable(r.status) && !r.removedAt,
    )
    .map((r) => ({
      ...r,
      removed: Boolean(r.removedAt),
      cover: r.coverKey
        ? { url: publicUrl(r.coverKey), width: r.coverWidth!, height: r.coverHeight! }
        : null,
    }));
}

/** One collection by owner handle and slug, for the public page. */
/**
 * Removed trips are gone for everyone but their owner and a moderator.
 *
 * The flag is checked by the page rather than filtered here, because the
 * owner still has to be able to open it -- the same arrangement stories
 * use.
 */
export async function findBySlug(handle: string, slug: string) {
  const [row] = await db
    .select({ collection: collections, profile: profiles })
    .from(collections)
    .innerJoin(profiles, eq(profiles.userId, collections.ownerId))
    .where(
      and(
        sql`lower(${profiles.handle}) = ${handle.toLowerCase()}`,
        eq(collections.slug, slug),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function findOwn(collectionId: string, ownerId: string) {
  const [row] = await db
    .select()
    .from(collections)
    .where(
      and(eq(collections.id, collectionId), eq(collections.ownerId, ownerId)),
    )
    .limit(1);
  return row ?? null;
}

/**
 * Collections to show, with the summary each card needs.
 *
 * `onlyListed` is the difference between a visitor's view of a profile and
 * the owner's own shelf.
 */
export async function listFor(
  ownerId: string,
  onlyListed: boolean,
): Promise<CollectionCard[]> {
  const [owner] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, ownerId))
    .limit(1);

  const rows = await db
    .select()
    .from(collections)
    .where(
      onlyListed
        ? and(
            eq(collections.ownerId, ownerId),
            eq(collections.status, "published"),
            // A taken-down trip is not listed on its owner's profile.
            isNull(collections.removedAt),
          )
        : eq(collections.ownerId, ownerId),
    )
    .orderBy(desc(collections.updatedAt));

  if (rows.length === 0) return [];

  /*
   * One query for every collection's stories rather than one each. A
   * profile with six trips would otherwise be seven round trips to draw a
   * row of cards.
   */
  const members = await db
    .select({
      collectionId: collectionStories.collectionId,
      position: collectionStories.position,
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
      inArray(collectionStories.collectionId, rows.map((r) => r.id)),
    )
    .orderBy(asc(collectionStories.position));

  return rows.map((c) => {
    const mine = members.filter(
      (m) =>
        m.collectionId === c.id &&
        (onlyListed ? isReadable(m.status) && !m.removedAt : true),
    );
    const withCover = mine.find((m) => m.coverKey);

    return {
      id: c.id,
      slug: c.slug,
      href: `/@${owner?.handle ?? ""}/trips/${c.slug}`,
      title: c.title,
      description: c.description,
      status: c.status,
      storyCount: mine.length,
      // The first story's photograph stands in. A collection with its own
      // cover would need its own upload path for very little.
      cover: withCover
        ? {
            url: publicUrl(withCover.coverKey!),
            width: withCover.coverWidth!,
            height: withCover.coverHeight!,
          }
        : null,
      countries: [
        ...new Set(mine.map((m) => m.countryCode).filter(Boolean)),
      ] as string[],
      minutes: mine.reduce((n, m) => n + m.readingMinutes, 0),
      updatedAt: c.updatedAt,
    };
  });
}

export type Placement = {
  collection: { title: string; slug: string; handle: string; href: string };
  position: number;
  total: number;
  minutes: number;
  /** Every part a reader can reach, in order, this one marked. */
  parts: { title: string; href: string; current: boolean }[];
  previous: { title: string; href: string } | null;
  next: { title: string; href: string } | null;
};

/**
 * Where this story sits in any collection anyone can read.
 *
 * The point of a trip is that part three leads to part four, so the
 * reading page needs the neighbours, not just the label. Hidden siblings
 * are skipped rather than shown as dead links -- the numbering is of what
 * a reader can actually reach.
 */
export async function placementsOf(storyId: string): Promise<Placement[]> {
  const memberships = await db
    .select({ collectionId: collectionStories.collectionId })
    .from(collectionStories)
    .innerJoin(collections, eq(collections.id, collectionStories.collectionId))
    .where(
      and(
        eq(collectionStories.storyId, storyId),
        inArray(collections.status, ["published", "unlisted"]),
        // No "part 2 of" pointing at a trip nobody can open.
        isNull(collections.removedAt),
      ),
    );

  const out: Placement[] = [];
  for (const m of memberships) {
    const [row] = await db
      .select({ collection: collections, handle: profiles.handle })
      .from(collections)
      .innerJoin(profiles, eq(profiles.userId, collections.ownerId))
      .where(eq(collections.id, m.collectionId))
      .limit(1);
    if (!row) continue;

    const entries = await entriesOf(m.collectionId, false);
    const index = entries.findIndex((e) => e.id === storyId);
    if (index === -1) continue;

    const link = (e: CollectionEntry) => ({
      title: e.title || "Untitled",
      href: `/@${e.handle}/${e.slug}`,
    });

    out.push({
      collection: {
        title: row.collection.title || "Untitled",
        slug: row.collection.slug,
        handle: row.handle,
        href: `/@${row.handle}/trips/${row.collection.slug}`,
      },
      position: index + 1,
      total: entries.length,
      minutes: entries.reduce((n, e) => n + e.readingMinutes, 0),
      parts: entries.map((e, i) => ({ ...link(e), current: i === index })),
      previous: index > 0 ? link(entries[index - 1]) : null,
      next: index < entries.length - 1 ? link(entries[index + 1]) : null,
    });
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Writing
 * ------------------------------------------------------------------ */

export async function createCollection(ownerId: string, title: string) {
  const clean = title.trim().slice(0, MAX_TITLE);
  const taken = await db
    .select({ slug: collections.slug })
    .from(collections)
    .where(eq(collections.ownerId, ownerId));

  const slug = uniqueSlug(
    slugify(clean || "trip"),
    new Set(taken.map((t) => t.slug)),
  );

  const [row] = await db
    .insert(collections)
    .values({ ownerId, title: clean, slug })
    .returning({ id: collections.id });
  return row.id;
}

export async function updateCollection(
  collectionId: string,
  patch: { title?: string; description?: string | null },
) {
  await db
    .update(collections)
    .set({
      ...(patch.title !== undefined
        ? { title: patch.title.trim().slice(0, MAX_TITLE) }
        : {}),
      ...(patch.description !== undefined
        ? {
            description:
              patch.description?.trim().slice(0, MAX_DESCRIPTION) || null,
          }
        : {}),
      updatedAt: new Date(),
    })
    .where(eq(collections.id, collectionId));
}

/**
 * Adds a story to the end.
 *
 * The story has to belong to the same person. Without that check a
 * collection is a way to present someone else's writing as part of your
 * trip, which is a small and very annoying kind of theft.
 */
export async function addStory(
  collectionId: string,
  storyId: string,
  ownerId: string,
): Promise<boolean> {
  const [own] = await db
    .select({ id: stories.id })
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.authorId, ownerId)))
    .limit(1);
  if (!own) return false;

  const [last] = await db
    .select({ max: sql<number>`coalesce(max(${collectionStories.position}), -1)` })
    .from(collectionStories)
    .where(eq(collectionStories.collectionId, collectionId));

  await db
    .insert(collectionStories)
    .values({ collectionId, storyId, position: (last?.max ?? -1) + 1 })
    // Adding the same story twice is a no-op, not an error: the list it
    // wanted to be on already has it.
    .onConflictDoNothing();

  await touch(collectionId);
  return true;
}

export async function removeStory(collectionId: string, storyId: string) {
  await db
    .delete(collectionStories)
    .where(
      and(
        eq(collectionStories.collectionId, collectionId),
        eq(collectionStories.storyId, storyId),
      ),
    );
  await touch(collectionId);
}

/**
 * Moves one story up or down by one place.
 *
 * Swap-with-neighbour rather than drag and drop: two buttons work with a
 * keyboard, on a phone and with no JavaScript story to tell, and a trip is
 * short enough that nobody is dragging item forty.
 */
export async function moveStory(
  collectionId: string,
  storyId: string,
  direction: "up" | "down",
): Promise<void> {
  const rows = await db
    .select({ storyId: collectionStories.storyId })
    .from(collectionStories)
    .innerJoin(stories, eq(stories.id, collectionStories.storyId))
    .where(eq(collectionStories.collectionId, collectionId))
    .orderBy(asc(collectionStories.position), asc(stories.publishedAt));

  const index = rows.findIndex((r) => r.storyId === storyId);
  if (index === -1) return;

  const target = direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= rows.length) return;

  const order = rows.map((r) => r.storyId);
  [order[index], order[target]] = [order[target], order[index]];

  /*
   * Every position rewritten, not just the two that swapped. Positions
   * drift -- a removal leaves a gap, an old row may share a number -- and
   * renumbering the whole list costs one statement per story in a list of
   * six.
   */
  await db.transaction(async (tx) => {
    for (const [position, id] of order.entries()) {
      await tx
        .update(collectionStories)
        .set({ position })
        .where(
          and(
            eq(collectionStories.collectionId, collectionId),
            eq(collectionStories.storyId, id),
          ),
        );
    }
  });
  await touch(collectionId);
}

export async function setCollectionStatus(
  collectionId: string,
  next: Visibility,
  hadPublished: Date | null,
) {
  await db
    .update(collections)
    .set({
      status: next,
      publishedAt: hadPublished ?? (isReadable(next) ? new Date() : null),
      updatedAt: new Date(),
    })
    .where(eq(collections.id, collectionId));
}

export async function deleteCollection(collectionId: string) {
  // The stories themselves are untouched: a collection is a view of them,
  // and deleting the shelf is not deleting the books.
  await db.delete(collections).where(eq(collections.id, collectionId));
}

/** The owner's stories that are not in this collection yet. */
export async function addableStories(
  ownerId: string,
  collectionId: string,
): Promise<{ id: string; title: string; status: Visibility }[]> {
  const already = await db
    .select({ storyId: collectionStories.storyId })
    .from(collectionStories)
    .where(eq(collectionStories.collectionId, collectionId));
  const taken = new Set(already.map((a) => a.storyId));

  const rows = await db
    .select({ id: stories.id, title: stories.title, status: stories.status })
    .from(stories)
    .where(and(eq(stories.authorId, ownerId), isNull(stories.removedAt)))
    .orderBy(desc(stories.updatedAt));

  return rows.filter((r) => !taken.has(r.id));
}

function touch(collectionId: string) {
  return db
    .update(collections)
    .set({ updatedAt: new Date() })
    .where(eq(collections.id, collectionId));
}
