"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { profiles, stories } from "@/lib/db/schema";
import type { Story } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import { slugForTitle } from "@/lib/stories";
import { docToText, readingMinutes, textToDoc } from "@/lib/story-doc";

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

export type SaveResult = { ok: true; savedAt: number } | { ok: false; error: string };

export async function saveStory(
  storyId: string,
  title: string,
  body: string,
): Promise<SaveResult> {
  const story = await requireOwnStory(storyId);

  const cleanTitle = title.slice(0, 200);
  const text = body;

  // A published story keeps its slug. Re-slugging on a title tweak would
  // silently break every link already pointing at it (PLAN.md 4.1).
  const slug =
    story.status === "draft"
      ? await slugForTitle(story.authorId, cleanTitle, story.id)
      : story.slug;

  await db
    .update(stories)
    .set({
      title: cleanTitle,
      slug,
      bodyJson: textToDoc(text),
      bodyText: text,
      readingMinutes: readingMinutes(text),
      updatedAt: new Date(),
    })
    .where(eq(stories.id, story.id));

  if (story.status !== "draft") await revalidateStory(story.authorId, slug);
  return { ok: true, savedAt: Date.now() };
}

export type PublishResult = { ok: true; url: string } | { ok: false; error: string };

export async function publishStory(storyId: string): Promise<PublishResult> {
  const story = await requireOwnStory(storyId);

  if (story.title.trim().length === 0) {
    return { ok: false, error: "Give the story a title before publishing." };
  }
  if (docToText(story.bodyJson).trim().length === 0) {
    return { ok: false, error: "The story is empty." };
  }

  const slug =
    story.status === "draft"
      ? await slugForTitle(story.authorId, story.title, story.id)
      : story.slug;

  await db
    .update(stories)
    .set({
      status: "published",
      slug,
      // Preserved on re-publish: this is the original publication date, not
      // the date of the most recent edit.
      publishedAt: story.publishedAt ?? new Date(),
      updatedAt: new Date(),
    })
    .where(eq(stories.id, story.id));

  const handle = await handleFor(story.authorId);
  revalidatePath("/");
  revalidatePath(`/@${handle}`);
  revalidatePath(`/@${handle}/${slug}`);

  return { ok: true, url: `/@${handle}/${slug}` };
}

export async function unpublishStory(storyId: string) {
  const story = await requireOwnStory(storyId);

  await db
    .update(stories)
    .set({ status: "draft", updatedAt: new Date() })
    .where(eq(stories.id, story.id));

  await revalidateStory(story.authorId, story.slug);
  revalidatePath("/");
}

export async function deleteStory(storyId: string) {
  const story = await requireOwnStory(storyId);
  await db.delete(stories).where(eq(stories.id, story.id));

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
