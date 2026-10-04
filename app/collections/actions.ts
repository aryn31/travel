"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer, isModerator } from "@/lib/session";
import {
  addStory,
  createCollection,
  deleteCollection,
  entriesOf,
  findOwn,
  moveStory,
  removeStory,
  setCollectionStatus,
  updateCollection,
} from "@/lib/collections";
import { VISIBILITIES, needsPublishCheck, type Visibility } from "@/lib/visibility";

/**
 * Everything a person can do to their own collection.
 *
 * Each one re-reads the collection scoped to the signed-in user, so
 * ownership is proved by the query rather than by the id that was sent.
 */
async function own(collectionId: string) {
  const viewer = await getViewer();
  if (!viewer?.profile) return null;
  const collection = await findOwn(collectionId, viewer.userId);
  if (!collection) return null;
  return { viewer, collection, handle: viewer.profile.handle };
}

export type CollectionResult = { ok: true } | { ok: false; error: string };

export async function createCollectionAction(formData: FormData) {
  const viewer = await getViewer();
  if (!viewer?.profile) redirect("/signin?next=%2Fcollections");
  // Same reason as createDraft: this is the call that makes the row.
  if (isModerator(viewer)) redirect("/admin");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const id = await createCollection(viewer.userId, title);
  revalidatePath("/collections");
  redirect(`/collections/${id}`);
}

export async function updateCollectionAction(
  collectionId: string,
  formData: FormData,
): Promise<CollectionResult> {
  const ctx = await own(collectionId);
  if (!ctx) return { ok: false, error: "Not yours." };

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { ok: false, error: "Give it a name." };

  await updateCollection(collectionId, {
    title,
    description: String(formData.get("description") ?? ""),
  });
  touch(ctx.handle, ctx.collection.slug, collectionId);
  return { ok: true };
}

export async function addStoryAction(
  collectionId: string,
  storyId: string,
): Promise<CollectionResult> {
  const ctx = await own(collectionId);
  if (!ctx) return { ok: false, error: "Not yours." };

  const done = await addStory(collectionId, storyId, ctx.viewer.userId);
  if (!done) return { ok: false, error: "That story isn't yours." };

  touch(ctx.handle, ctx.collection.slug, collectionId);
  return { ok: true };
}

export async function removeStoryAction(
  collectionId: string,
  storyId: string,
): Promise<CollectionResult> {
  const ctx = await own(collectionId);
  if (!ctx) return { ok: false, error: "Not yours." };

  await removeStory(collectionId, storyId);
  touch(ctx.handle, ctx.collection.slug, collectionId);
  return { ok: true };
}

export async function moveStoryAction(
  collectionId: string,
  storyId: string,
  direction: "up" | "down",
): Promise<CollectionResult> {
  const ctx = await own(collectionId);
  if (!ctx) return { ok: false, error: "Not yours." };

  await moveStory(collectionId, storyId, direction);
  touch(ctx.handle, ctx.collection.slug, collectionId);
  return { ok: true };
}

export async function setCollectionStatusAction(
  collectionId: string,
  next: Visibility,
): Promise<CollectionResult> {
  const ctx = await own(collectionId);
  if (!ctx) return { ok: false, error: "Not yours." };

  if (!VISIBILITIES.includes(next)) {
    return { ok: false, error: "Unknown visibility." };
  }

  /*
   * A collection of nothing is not a trip. The story-length floor does not
   * apply here -- the stories were each held to it already -- but sharing
   * an empty shelf would put a dead page on a profile.
   */
  if (needsPublishCheck(next)) {
    const visible = await entriesOf(collectionId, false);
    if (visible.length === 0) {
      return { ok: false, error: "Add a published story before sharing this." };
    }
  }

  await setCollectionStatus(collectionId, next, ctx.collection.publishedAt);
  touch(ctx.handle, ctx.collection.slug, collectionId);
  return { ok: true };
}

export async function deleteCollectionAction(collectionId: string) {
  const ctx = await own(collectionId);
  if (!ctx) redirect("/collections");

  await deleteCollection(collectionId);
  revalidatePath("/collections");
  revalidatePath(`/@${ctx.handle}`);
  redirect("/collections");
}

/** The pages a change to a collection can be seen on. */
function touch(handle: string, slug: string, collectionId: string) {
  revalidatePath("/collections");
  revalidatePath(`/collections/${collectionId}`);
  revalidatePath(`/@${handle}`);
  revalidatePath(`/@${handle}/trips/${slug}`);
}
