"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { media, profiles, stories } from "@/lib/db/schema";
import type { Story } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { slugForTitle } from "@/lib/stories";
import { docToSummary, docToText, isDoc, readingMinutes } from "@/lib/story-doc";
import { remove as removeFromStorage } from "@/lib/storage";
import { reconcileStoryMedia } from "@/lib/media-gc";
import { isCountryCode } from "@/lib/countries";
import { canonicalPlaceName } from "@/lib/places";
import { parseTags, setStoryTags } from "@/lib/tags";
import { publishBlock } from "@/lib/publish-rules";
import {
  isFrozen,
  needsPublishCheck,
  VISIBILITIES,
  type Visibility,
} from "@/lib/visibility";

/**
 * Every mutation goes through this. Ownership is checked against the session
 * on the server -- the story id in the URL is user input and proves nothing.
 */
async function requireOwnStory(storyId: string): Promise<Story> {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");

  const [story] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, storyId), eq(stories.authorId, viewer.userId)))
    .limit(1);

  // Deliberately the same outcome whether the story is missing or belongs to
  // someone else, so this can't be used to probe which ids exist.
  if (!story) redirect("/drafts");
  return story;
}

/**
 * Published is final, until it is unpublished.
 *
 * A story that is live has readers, comments hanging off it and a URL
 * people have shared. Editing it underneath them changes what a comment is
 * replying to and what a reader recommended. So the content is frozen while
 * it is out, and the way to change it is to take it down first -- which is
 * visible, reversible, and makes the author decide to do it.
 *
 * Enforced here rather than only in the editor: the editor renders
 * read-only, but a Server Action is a public endpoint and the greyed-out
 * field is a courtesy.
 */
function isLocked(story: Story): boolean {
  return isFrozen(story.status);
}

export async function createDraft() {
  const viewer = await getViewer();
  if (!viewer) redirect("/signin");
  if (!viewer.profile) redirect("/onboarding");

  const id = crypto.randomUUID();
  await db.insert(stories).values({
    id,
    authorId: viewer.userId,
    // Placeholder until the story has a title; drafts re-slug on every save.
    slug: `untitled-${id.slice(0, 8)}`,
  });

  redirect(`/write/${id}`);
}

// A story is prose, not a payload. Without a ceiling, one request could park
// an arbitrarily large document in the database.
const MAX_DOC_BYTES = 1_000_000;

export type SaveResult =
  /*
   * `placeName` is what was stored, which is not always what was sent:
   * a place snaps to the spelling it already goes by. Reported back so the
   * field can show it, rather than leaving the writer looking at "naples"
   * while the database and every reader say "Naples".
   */
  | { ok: true; savedAt: number; placeName: string | null }
  | { ok: false; error: string };

export type SavePlace = { placeName: string; countryCode: string };

export async function saveStory(
  storyId: string,
  title: string,
  doc: unknown,
  place?: SavePlace,
  /** Raw, comma-separated, exactly as typed -- parsed here, not in the browser. */
  tagInput?: string,
): Promise<SaveResult> {
  const story = await requireOwnStory(storyId);

  if (isLocked(story)) {
    return {
      ok: false,
      error: "This story is published. Unpublish it to make changes.",
    };
  }

  // The document arrives from the browser, so it gets shape-checked before it
  // becomes the stored source of truth.
  if (!isDoc(doc)) return { ok: false, error: "Could not save — bad document." };

  const size = JSON.stringify(doc).length;
  if (size > MAX_DOC_BYTES) {
    return {
      ok: false,
      error: "This story is too long to save. Try splitting it in two.",
    };
  }

  const cleanTitle = title.slice(0, 200);
  const text = docToText(doc);

  /*
   * Place feeds three things: the chip on the card, the country filter on
   * /stories, and the weight-A half of the search vector. An unknown country
   * code is dropped rather than rejected -- it is a select on the client, so
   * a bad value means something tampered, and failing the whole save would
   * cost the author their paragraph to punish a field they cannot see.
   */
  /*
   * Snapped to the spelling this place already goes by, so "naples" saves
   * as "Naples". Every query already matches case insensitively; this is
   * what makes the story's own page agree with the filter chip rather than
   * quietly holding a third spelling of somewhere everyone else named.
   */
  const typedPlace = place?.placeName.trim().slice(0, 120) || null;
  /* Skipped when the field has not been touched. Autosave fires every
     1.2 seconds of typing, and a round trip to Supabase to re-answer a
     question about a field nobody edited is latency on every keystroke
     run. */
  const placeName =
    !typedPlace || typedPlace === story.placeName
      ? typedPlace
      : await canonicalPlaceName(typedPlace);
  const countryCode =
    place?.countryCode && isCountryCode(place.countryCode)
      ? place.countryCode.toUpperCase()
      : null;

  /*
   * A story that has ever been published keeps its slug, and `publishedAt`
   * is what remembers that -- not `status`.
   *
   * Editing now means unpublish, edit, republish, so by the time a title is
   * being changed the status is back to "draft". Keying on status would
   * re-slug on the way through and silently break every link already
   * pointing at it (PLAN.md 4.1); publishedAt survives the round trip.
   */
  const slug = story.publishedAt
    ? story.slug
    : await slugForTitle(story.authorId, cleanTitle, story.id);

  /*
   * Parsed server-side even though the field already previews the result:
   * the preview is a convenience, and the string arrives from a browser
   * that may not have run it.
   */
  if (tagInput !== undefined) {
    await setStoryTags(story.id, parseTags(tagInput));
  }

  await db
    .update(stories)
    .set({
      title: cleanTitle,
      slug,
      bodyJson: doc,
      bodyText: text,
      excerpt: docToSummary(doc),
      readingMinutes: readingMinutes(text),
      placeName,
      countryCode,
      updatedAt: new Date(),
    })
    .where(eq(stories.id, story.id));

  /*
   * An image dropped from the body has just stopped being referenced. This
   * marks it, and sweeps anything that has stayed unreferenced past the
   * grace period -- without it, every deleted image left its file in the
   * bucket permanently.
   */
  await reconcileStoryMedia(story.id);

  // No revalidate: a draft has no public page to revalidate, and a
  // published one never reaches here.
  return { ok: true, savedAt: Date.now(), placeName };
}

export type PublishResult = { ok: true; url: string | null } | { ok: false; error: string };

/**
 * Moves a story between the four states in lib/visibility.ts.
 *
 * One action rather than publish/unpublish/hide, because the rules that
 * matter are about the state being entered, not about which button was
 * pressed -- and twelve transitions written as three actions is where the
 * inconsistencies would live.
 */
export async function setVisibility(
  storyId: string,
  next: Visibility,
): Promise<PublishResult> {
  const story = await requireOwnStory(storyId);

  // The select is a client control, so the value is checked rather than
  // trusted -- an unknown status would otherwise reach the enum as a
  // database error.
  if (!VISIBILITIES.includes(next)) {
    return { ok: false, error: "Unknown visibility." };
  }
  if (next === story.status) return { ok: true, url: null };

  /*
   * The length floor applies to the states that put the story in front of
   * someone. Filing your own notes away privately is not publishing.
   */
  if (needsPublishCheck(next)) {
    const blocked = publishBlock(story.title, docToText(story.bodyJson));
    if (blocked) return { ok: false, error: blocked.reason };
  }

  // Same rule as saveStory: once it has had a URL, it keeps it.
  const slug = story.publishedAt
    ? story.slug
    : await slugForTitle(story.authorId, story.title, story.id);

  await db
    .update(stories)
    .set({
      status: next,
      slug,
      /*
       * Stamped the first time it goes out and never again. This is the
       * original publication date, not the date of the most recent change
       * of mind -- and it is also what tells a private story apart from a
       * draft.
       */
      publishedAt:
        story.publishedAt ?? (needsPublishCheck(next) ? new Date() : null),
      updatedAt: new Date(),
    })
    .where(eq(stories.id, story.id));

  const handle = await handleFor(story.authorId);
  /*
   * Both the old slug and the new one, and the lists either way: a story
   * leaving `published` has to disappear from pages it is currently on,
   * which is the half that is easy to forget.
   */
  revalidatePath("/");
  revalidatePath("/stories");
  revalidatePath(`/@${handle}`);
  revalidatePath(`/@${handle}/${slug}`);
  if (slug !== story.slug) revalidatePath(`/@${handle}/${story.slug}`);

  return { ok: true, url: next === "draft" ? null : `/@${handle}/${slug}` };
}

export async function deleteStory(storyId: string) {
  const story = await requireOwnStory(storyId);

  // Read the keys before the delete: the media rows go with the story, and
  // without them the files would be unreachable and permanent.
  const owned = await db
    .select({ storageKey: media.storageKey })
    .from(media)
    .where(eq(media.storyId, story.id));

  await db.delete(stories).where(eq(stories.id, story.id));
  await db.delete(media).where(eq(media.storyId, story.id));

  // Storage last. A failure here leaks a file, which is recoverable; failing
  // before the database delete would leave a story pointing at nothing.
  await Promise.allSettled(owned.map((m) => removeFromStorage(m.storageKey)));

  await revalidateStory(story.authorId, story.slug);
  revalidatePath("/");
  redirect("/drafts");
}

async function handleFor(userId: string): Promise<string> {
  const [row] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);
  return row?.handle ?? "";
}

async function revalidateStory(authorId: string, slug: string) {
  const handle = await handleFor(authorId);
  if (!handle) return;
  revalidatePath(`/@${handle}`);
  revalidatePath(`/@${handle}/${slug}`);
}

/** Cover image. Passing null clears it. */
export async function setCover(storyId: string, mediaId: string | null) {
  const story = await requireOwnStory(storyId);
  // The cover is part of the story, so it freezes with the rest of it.
  if (isLocked(story)) return;

  if (mediaId !== null) {
    // Confirm the image belongs to this author -- otherwise any media id
    // could be pinned to any story.
    const [owned] = await db
      .select({ id: media.id })
      .from(media)
      .where(and(eq(media.id, mediaId), eq(media.ownerId, story.authorId)))
      .limit(1);
    if (!owned) return;
  }

  await db
    .update(stories)
    .set({ coverMediaId: mediaId, updatedAt: new Date() })
    .where(eq(stories.id, story.id));

  // Removing a cover leaves its image referenced by nothing, unless the
  // body happens to use it too -- which reconcile works out.
  await reconcileStoryMedia(story.id);

}
