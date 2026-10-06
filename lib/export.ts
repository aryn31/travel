import "server-only";
import { asc, eq, inArray } from "drizzle-orm";
import { db } from "./db";
import {
  collections,
  collectionStories,
  comments,
  likes,
  media,
  profiles,
  saves,
  stories,
  users,
} from "./db/schema";
import { get as readFromStorage } from "./storage";

/**
 * Everything this account has, as one file.
 *
 * The other half of deleting an account: a person is entitled to leave
 * with what they wrote, not only to destroy it. Deletion has existed for
 * a while and this had not, which made the pair incoherent -- you could
 * burn the archive but not take a copy.
 *
 * JSON rather than a zip of markdown. The bodies are TipTap documents and
 * flattening them to prose would quietly lose the images, the links and
 * the pull quotes; the whole document is here, so nothing is lost even if
 * it needs a program to read.
 */
export type Export = {
  exportedAt: string;
  account: {
    email: string;
    handle: string;
    displayName: string;
    bio: string | null;
    website: string | null;
    homeCountry: string | null;
    joined: string;
    role: string;
  };
  stories: unknown[];
  trips: unknown[];
  comments: unknown[];
  likes: unknown[];
  saved: unknown[];
  /**
   * Named, not linked.
   *
   * The files themselves are in the archive beside this one, under
   * `photographs/`. An earlier version listed bucket URLs instead, which
   * was worse than it looked: those URLs work for anybody holding them,
   * so a copy of the export left in a shared folder was a working link to
   * every photograph in it -- including ones in drafts and private
   * stories that are not otherwise readable.
   */
  photographs: { file: string; uploadedAt: string; bytes: number }[];
  notes: string[];
};

export async function buildExport(userId: string): Promise<Export | null> {
  const [who] = await db
    .select({ user: users, profile: profiles })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  if (!who?.profile) return null;

  const myStories = await db
    .select()
    .from(stories)
    .where(eq(stories.authorId, userId))
    .orderBy(asc(stories.createdAt));

  const myTrips = await db
    .select()
    .from(collections)
    .where(eq(collections.ownerId, userId))
    .orderBy(asc(collections.createdAt));

  const tripParts = myTrips.length
    ? await db
        .select({
          collectionId: collectionStories.collectionId,
          position: collectionStories.position,
          storyId: collectionStories.storyId,
          title: stories.title,
        })
        .from(collectionStories)
        .innerJoin(stories, eq(stories.id, collectionStories.storyId))
        .where(
          inArray(collectionStories.collectionId, myTrips.map((t) => t.id)),
        )
        .orderBy(asc(collectionStories.position))
    : [];

  const myComments = await db
    .select({
      id: comments.id,
      body: comments.body,
      createdAt: comments.createdAt,
      deletedAt: comments.deletedAt,
      onStory: stories.title,
      onStorySlug: stories.slug,
    })
    .from(comments)
    .innerJoin(stories, eq(stories.id, comments.storyId))
    .where(eq(comments.authorId, userId))
    .orderBy(asc(comments.createdAt));

  const myLikes = await db
    .select({ story: stories.title, at: likes.createdAt })
    .from(likes)
    .innerJoin(stories, eq(stories.id, likes.storyId))
    .where(eq(likes.userId, userId))
    .orderBy(asc(likes.createdAt));

  const mySaves = await db
    .select({
      story: stories.title,
      at: saves.createdAt,
    })
    .from(saves)
    .leftJoin(stories, eq(stories.id, saves.storyId))
    .where(eq(saves.userId, userId))
    .orderBy(asc(saves.createdAt));

  const myMedia = await mediaOf(userId);

  return {
    exportedAt: new Date().toISOString(),
    account: {
      email: who.user.email ?? "",
      handle: who.profile.handle,
      displayName: who.profile.displayName,
      bio: who.profile.bio,
      website: who.profile.website,
      homeCountry: who.profile.homeCountry,
      joined: who.user.createdAt.toISOString(),
      role: who.user.role,
    },
    stories: myStories.map((s) => ({
      title: s.title,
      slug: s.slug,
      status: s.status,
      place: s.placeName,
      country: s.countryCode,
      publishedAt: s.publishedAt?.toISOString() ?? null,
      updatedAt: s.updatedAt.toISOString(),
      readingMinutes: s.readingMinutes,
      likes: s.likeCount,
      comments: s.commentCount,
      removedByModerator: Boolean(s.removedAt),
      // The whole document, not the flattened text -- see the note above.
      body: s.bodyJson,
      plainText: s.bodyText,
    })),
    trips: myTrips.map((t) => ({
      title: t.title,
      slug: t.slug,
      description: t.description,
      status: t.status,
      createdAt: t.createdAt.toISOString(),
      parts: tripParts
        .filter((p) => p.collectionId === t.id)
        .map((p) => ({ position: p.position, title: p.title })),
    })),
    comments: myComments.map((c) => ({
      body: c.body,
      onStory: c.onStory,
      writtenAt: c.createdAt.toISOString(),
      removed: Boolean(c.deletedAt),
    })),
    likes: myLikes.map((l) => ({
      story: l.story,
      at: l.at.toISOString(),
    })),
    saved: mySaves.map((s) => ({
      story: s.story,
      at: s.at.toISOString(),
    })),
    photographs: myMedia.map((m) => ({
      file: `photographs/${fileNameFor(m.key)}`,
      uploadedAt: m.createdAt.toISOString(),
      bytes: m.bytes,
    })),
    notes: [
      "Stories are TipTap documents under `body`, with a flattened copy under `plainText`.",
      "Photographs are the files in the `photographs` folder beside this one.",
      "Comments other people wrote on your stories are not here: they are their words, not yours.",
      "Likes and saves name the story rather than the person, for the same reason.",
    ],
  };
}

/**
 * The media rows this account owns.
 *
 * Shared by the manifest and the archive so the two cannot disagree about
 * what is in the download.
 */
export async function mediaOf(userId: string) {
  return db
    .select({
      key: media.storageKey,
      bytes: media.bytes,
      createdAt: media.createdAt,
    })
    .from(media)
    .where(eq(media.ownerId, userId))
    .orderBy(asc(media.createdAt));
}

/**
 * The name a photograph takes inside the archive.
 *
 * The last segment of the storage key, which is already a UUID and a file
 * extension. The owner-id prefix is dropped: it says nothing to the
 * person who owns every file in the folder.
 */
export function fileNameFor(key: string): string {
  return key.split("/").pop() ?? key;
}

/**
 * Fetches each photograph as the archive asks for it.
 *
 * A generator rather than a list, so an account with three hundred
 * photographs never has three hundred of them in memory at once.
 *
 * A file that cannot be read is skipped rather than failing the export:
 * an archive missing one photograph is worth having, and an error page
 * instead of an archive is not.
 */
export async function* photographFiles(userId: string) {
  for (const m of await mediaOf(userId)) {
    const bytes = await readFromStorage(m.key).catch(() => null);
    if (!bytes) continue;
    yield {
      name: `photographs/${fileNameFor(m.key)}`,
      body: new Uint8Array(bytes),
      modified: m.createdAt,
    };
  }
}
