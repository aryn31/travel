"use client";

import { finalizeUpload, requestUpload } from "@/app/media/actions";

/** PLAN.md §8: resizing on upload is the single biggest lever on image cost. */
const MAX_EDGE = 2560;
const QUALITY = 0.82;

export type UploadedImage = {
  id: string;
  url: string;
  width: number;
  height: number;
};

function encode(
  canvas: HTMLCanvasElement,
  type: string,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, QUALITY));
}

async function shrink(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  // WebP keeps alpha and compresses better, but Safari only learned to encode
  // it fairly recently -- fall back rather than shipping a broken upload.
  let blob = await encode(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") {
    blob = await encode(canvas, "image/jpeg");
  }
  if (!blob) throw new Error("Could not process this image");

  return { blob, width, height };
}

function putWithProgress(
  url: string,
  blob: Blob,
  onProgress: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    // XHR rather than fetch: fetch still can't report upload progress, and a
    // 12MP photo on hotel wifi needs a progress bar.
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(e.loaded / e.total);
    });
    xhr.addEventListener("load", () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`)),
    );
    xhr.addEventListener("error", () => reject(new Error("Upload failed")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
    xhr.send(blob);
  });
}

export async function uploadImage(
  file: File,
  storyId: string,
  onProgress: (fraction: number) => void = () => {},
): Promise<UploadedImage> {
  if (!file.type.startsWith("image/")) throw new Error("Images only.");

  onProgress(0);
  const { blob, width, height } = await shrink(file);

  const ticket = await requestUpload(blob.type, blob.size);
  if (!ticket.ok) throw new Error(ticket.error);

  await putWithProgress(ticket.url, blob, onProgress);

  const saved = await finalizeUpload({
    key: ticket.key,
    mime: blob.type,
    bytes: blob.size,
    width,
    height,
    storyId,
  });
  if (!saved.ok) throw new Error(saved.error);

  onProgress(1);
  return saved;
}

/** Avatars are square and small; a 2560px portrait would be absurd. */
const AVATAR_EDGE = 512;

/**
 * Centre-crops to a square, then scales to 512px.
 *
 * Cropping in the browser rather than with CSS `object-fit` means the stored
 * file is the size it looks: a 12MP phone photo becomes ~40KB instead of
 * being downloaded in full and then squeezed into a 32px circle eleven times
 * a page.
 */
async function squareCrop(file: File): Promise<{ blob: Blob; size: number }> {
  const bitmap = await createImageBitmap(file);
  const edge = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - edge) / 2;
  const sy = (bitmap.height - edge) / 2;
  const size = Math.min(AVATAR_EDGE, edge);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, size, size);
  bitmap.close();

  let blob = await encode(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
  if (!blob) throw new Error("Could not process this image");

  return { blob, size };
}

/**
 * Uploads a profile photo and returns its storage key.
 *
 * Goes through the same signed-upload path as story images -- same size cap,
 * same allow-list, same driver -- but finishes by writing the key onto the
 * profile rather than creating a media row, because an avatar belongs to a
 * person rather than to a story.
 */
export async function uploadAvatar(
  file: File,
  onProgress: (fraction: number) => void = () => {},
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Images only.");

  onProgress(0);
  const { blob } = await squareCrop(file);

  const ticket = await requestUpload(blob.type, blob.size);
  if (!ticket.ok) throw new Error(ticket.error);

  await putWithProgress(ticket.url, blob, onProgress);
  onProgress(1);
  return ticket.key;
}

/* A banner, not a photograph: wide, short, and never shown taller than a
   few hundred pixels, so there is nothing to gain from storing more. */
const COVER_WIDTH = 1600;
const COVER_RATIO = 3; // 3:1

/**
 * Centre-crops to a wide banner and scales it down.
 *
 * The crop is horizontal-centre, vertical-third: a cover is usually a
 * landscape and the interesting part of a landscape is rarely its middle
 * row of pixels. Taking the upper third keeps horizons and skylines rather
 * than slicing through them.
 */
async function bannerCrop(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  const cropH = Math.min(bitmap.height, bitmap.width / COVER_RATIO);
  const cropW = cropH * COVER_RATIO;
  const sx = (bitmap.width - cropW) / 2;
  const sy = Math.min((bitmap.height - cropH) / 2, bitmap.height * 0.25);

  const width = Math.min(COVER_WIDTH, Math.round(cropW));
  const height = Math.round(width / COVER_RATIO);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  ctx.drawImage(bitmap, sx, sy, cropW, cropH, 0, 0, width, height);
  bitmap.close();

  let blob = await encode(canvas, "image/webp");
  if (!blob || blob.type !== "image/webp") blob = await encode(canvas, "image/jpeg");
  if (!blob) throw new Error("Could not process this image");
  return blob;
}

/** Uploads a profile banner and returns its storage key. */
export async function uploadCover(
  file: File,
  onProgress: (fraction: number) => void = () => {},
): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Images only.");

  onProgress(0);
  const blob = await bannerCrop(file);

  const ticket = await requestUpload(blob.type, blob.size);
  if (!ticket.ok) throw new Error(ticket.error);

  await putWithProgress(ticket.url, blob, onProgress);
  onProgress(1);
  return ticket.key;
}
