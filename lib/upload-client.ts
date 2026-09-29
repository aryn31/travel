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
