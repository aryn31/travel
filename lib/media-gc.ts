import "server-only";
import { and, eq, inArray, isNotNull, isNull, lt, sql } from "drizzle-orm";
import { db } from "./db";
import { media, profiles, stories } from "./db/schema";
import { keyFromSrc } from "./media-url";
import { imageUrls } from "./story-doc";
import { remove as removeFromStorage } from "./storage";

/**
 * Keeps stored images in step with the stories that reference them.
 *
 * An image removed from a story used to leave its row and its file behind
 * forever: the editor drops the node, and nothing downstream noticed. The
 * bytes stayed in the bucket, paid for, unreachable, and invisible -- the
 * worst kind of leak, because nothing ever reports it.
 *
 * Deleting on the spot is the obvious fix and the wrong one. Removing an
 * image and pressing undo is ordinary, and autosave fires a second later;
 * the file would be gone before the undo landed. So an unreferenced image
 * is *marked*, and only swept once it has stayed unreferenced for a while.
 */
const GRACE_MS = 30 * 60 * 1000;

/** Everything a story currently points at: its body images and its cover. */
async function referencedKeys(storyId: string): Promise<Set<string>> {
  const [story] = await db
    .select({ body: stories.bodyJson, cover: stories.coverMediaId })
    .from(stories)
    .where(eq(stories.id, storyId))
    .limit(1);

  const keys = new Set<string>();
  if (!story) return keys;

  for (const src of imageUrls(story.body)) {
    // Bodies hold whatever URL was current when the image was inserted, so
    // resolve back to the key rather than comparing URLs.
    const key = keyFromSrc(src);
    if (key) keys.add(key);
  }

  if (story.cover) {
    const [cover] = await db
      .select({ key: media.storageKey })
      .from(media)
      .where(eq(media.id, story.cover))
      .limit(1);
    // A cover is referenced even though it never appears in the body.
    if (cover) keys.add(cover.key);
  }

  return keys;
}

/**
 * Called after a story is saved. Marks what the story no longer uses,
 * un-marks anything that came back, and sweeps what has been gone long
 * enough.
 *
 * Scoped to one story so it stays cheap enough to run on every save.
 */
export async function reconcileStoryMedia(storyId: string): Promise<void> {
  const keys = await referencedKeys(storyId);

  /*
   * Adopt any referenced image that is not yet attached to this story.
   *
   * media.story_id arrived after the first uploads, so early rows have null
   * there and were invisible to everything below -- untracked, and never
   * swept. Claiming them here means a row only has to be referenced once to
   * join the system.
   */
  if (keys.size > 0) {
    await db
      .update(media)
      .set({ storyId })
      .where(and(isNull(media.storyId), inArray(media.storageKey, [...keys])));
  }

  const owned = await db
    .select({ id: media.id, key: media.storageKey, orphanedAt: media.orphanedAt })
    .from(media)
    .where(eq(media.storyId, storyId));

  const nowUnreferenced = owned.filter((m) => !keys.has(m.key) && !m.orphanedAt);
  const backInUse = owned.filter((m) => keys.has(m.key) && m.orphanedAt);

  if (nowUnreferenced.length > 0) {
    await db
      .update(media)
      .set({ orphanedAt: new Date() })
      .where(inArray(media.id, nowUnreferenced.map((m) => m.id)));
  }

  // Undo, or a paste of the same image: the clock resets rather than the
  // file being deleted out from under a story that uses it again.
  if (backInUse.length > 0) {
    await db
      .update(media)
      .set({ orphanedAt: null })
      .where(inArray(media.id, backInUse.map((m) => m.id)));
  }

  await sweep(storyId);
}

/**
 * Deletes rows and files for images that have been unreferenced past the
 * grace period.
 *
 * The file goes first. A row with no file renders as a broken image, which
 * is visible and fixable; a file with no row is invisible and permanent,
 * which is the thing this module exists to prevent -- so if only one of the
 * two can happen, it should be the recoverable one.
 */
export async function sweep(storyId?: string): Promise<number> {
  const cutoff = new Date(Date.now() - GRACE_MS);

  const due = await db
    .select({ id: media.id, key: media.storageKey })
    .from(media)
    .where(
      storyId
        ? and(
            eq(media.storyId, storyId),
            isNotNull(media.orphanedAt),
            lt(media.orphanedAt, cutoff),
          )
        : and(isNotNull(media.orphanedAt), lt(media.orphanedAt, cutoff)),
    );

  let removed = 0;
  for (const m of due) {
    try {
      await removeFromStorage(m.key);
    } catch {
      // Leave the row: it will be retried on the next sweep rather than
      // being forgotten with its file still in the bucket.
      continue;
    }
    await db.delete(media).where(eq(media.id, m.id));
    removed++;
  }
  return removed;
}

/**
 * Images attached to no story, or to a story that no longer exists.
 *
 * An upload is recorded before the save that references it, so a story
 * abandoned mid-write leaves rows nothing will ever reconcile. Avatars and
 * covers are safe from this: setAvatar and setCoverPhoto store the key on
 * the profile and never create a media row, so they are not in this table
 * to be mistaken for strays.
 *
 * Only used by the sweep script -- too broad to run on every save.
 */
export async function findStrays(): Promise<{ id: string; key: string; bytes: number }[]> {
  return db
    .select({ id: media.id, key: media.storageKey, bytes: media.bytes })
    .from(media)
    .where(
      sql`${media.storyId} is null
          or not exists (select 1 from ${stories} where ${stories.id} = ${media.storyId})`,
    );
}

/**
 * Every storage key anything in the database still points at.
 *
 * Deliberately wider than `media`: story bodies carry keys directly, and a
 * body can outlive its media row. Avatars and profile covers live only on
 * `profiles` and have no row at all. A file is only safe to delete if it
 * appears in none of these.
 */
export async function knownKeys(): Promise<Set<string>> {
  const known = new Set<string>();

  for (const m of await db.select({ k: media.storageKey }).from(media)) {
    known.add(m.k);
  }
  for (const p of await db
    .select({ a: profiles.avatarKey, c: profiles.coverKey })
    .from(profiles)) {
    if (p.a) known.add(p.a);
    if (p.c) known.add(p.c);
  }
  // The one that makes this safe: a key written into a document.
  for (const s of await db.select({ body: stories.bodyJson }).from(stories)) {
    for (const src of imageUrls(s.body)) {
      const key = keyFromSrc(src);
      if (key) known.add(key);
    }
  }

  return known;
}

export type BucketStray = { key: string; bytes: number };

/**
 * Files sitting in the bucket that nothing in the database points at.
 *
 * The row-driven sweep cannot see these: an upload that was never finalised
 * -- a tab closed mid-write -- leaves bytes with no row to find them by, and
 * so does any code path that replaces a key without deleting the old file.
 *
 * Supabase only. The local driver would need a directory walk, and local
 * disk is disposable anyway.
 */
export async function findBucketStrays(): Promise<BucketStray[] | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const bucket = process.env.SUPABASE_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_BUCKET;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !bucket || !key) return null;

  const known = await knownKeys();
  // Owner ids are the top level of the bucket; nothing is stored above one.
  const prefixes = [...new Set([...known].map((k) => k.split("/")[0]))];

  const strays: BucketStray[] = [];
  for (const prefix of prefixes) {
    const res = await fetch(`${url.replace(/\/+$/, "")}/storage/v1/object/list/${bucket}`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prefix, limit: 1000 }),
    });
    if (!res.ok) continue;

    const items = (await res.json()) as { name: string; metadata?: { size?: number } }[];
    for (const item of items) {
      const full = `${prefix}/${item.name}`;
      if (!known.has(full)) strays.push({ key: full, bytes: item.metadata?.size ?? 0 });
    }
  }
  return strays;
}
