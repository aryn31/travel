"use server";

import { and, count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { media, stories } from "@/lib/db/schema";
import { getViewer } from "@/lib/session";
import {
  ALLOWED_MIME,
  MAX_IMAGES_PER_STORY,
  MAX_UPLOAD_BYTES,
  createUploadUrl,
  newKey,
  publicUrl,
} from "@/lib/storage";

export type UploadTicket =
  | { ok: true; url: string; key: string }
  | { ok: false; error: string };

/** Step 1: validate what's about to be uploaded and hand back a signed target. */
export async function requestUpload(
  mime: string,
  bytes: number,
): Promise<UploadTicket> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to upload." };

  if (!ALLOWED_MIME[mime]) {
    return { ok: false, error: "Images only — JPEG, PNG, WebP or AVIF." };
  }
  if (bytes <= 0 || bytes > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `Too large — ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)}MB max.`,
    };
  }

  const key = newKey(viewer.userId, mime);
  const target = createUploadUrl(key);
  return { ok: true, url: target.url, key: target.key };
}

export type FinalizeResult =
  | { ok: true; id: string; url: string; width: number; height: number }
  | { ok: false; error: string };

/** Step 2: the bytes are in storage; record them so a story can reference them. */
export async function finalizeUpload(input: {
  key: string;
  mime: string;
  bytes: number;
  width: number;
  height: number;
  storyId: string;
}): Promise<FinalizeResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Sign in to upload." };

  if (!input.key.startsWith(`${viewer.userId}/`)) {
    return { ok: false, error: "Not your upload." };
  }
  if (!ALLOWED_MIME[input.mime]) {
    return { ok: false, error: "Unsupported image type." };
  }
  if (
    !Number.isInteger(input.width) ||
    !Number.isInteger(input.height) ||
    input.width < 1 ||
    input.height < 1 ||
    input.width > 20000 ||
    input.height > 20000
  ) {
    return { ok: false, error: "Bad image dimensions." };
  }

  // Cap per story rather than per account: the limit exists to keep one
  // story's page weight sane (PLAN.md 4.3).
  const [story] = await db
    .select({ id: stories.id })
    .from(stories)
    .where(
      and(eq(stories.id, input.storyId), eq(stories.authorId, viewer.userId)),
    )
    .limit(1);
  if (!story) return { ok: false, error: "Story not found." };

  const [{ used }] = await db
    .select({ used: count() })
    .from(media)
    .where(eq(media.ownerId, viewer.userId));
  if (used >= MAX_IMAGES_PER_STORY * 50) {
    return { ok: false, error: "Upload limit reached." };
  }

  const id = crypto.randomUUID();
  await db.insert(media).values({
    id,
    ownerId: viewer.userId,
    storageKey: input.key,
    width: input.width,
    height: input.height,
    mime: input.mime,
    bytes: input.bytes,
  });

  return {
    ok: true,
    id,
    url: publicUrl(input.key),
    width: input.width,
    height: input.height,
  };
}
