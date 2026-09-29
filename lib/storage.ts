import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * The seam between the app and wherever bytes actually live (PLAN.md 4.5).
 *
 * The local driver deliberately mimics R2's shape: the browser asks for an
 * upload target, then PUTs the raw body straight to it. Nothing in the editor
 * knows which driver is behind this, so swapping to R2 means implementing
 * these four functions, not rewriting the upload flow.
 */

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_IMAGES_PER_STORY = 20;

export const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

const ROOT = path.join(process.cwd(), "storage");
const UPLOAD_TTL_MS = 10 * 60 * 1000;

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return value;
}

/** Keys are user-supplied on the way back in, so they get validated, not trusted. */
export function isSafeKey(key: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*\/[A-Za-z0-9_-]+\.[a-z]{3,4}$/.test(key);
}

export function newKey(ownerId: string, mime: string): string {
  const ext = ALLOWED_MIME[mime];
  if (!ext) throw new Error(`Unsupported type: ${mime}`);
  // Owner id prefixes the key so a bucket listing stays navigable and a
  // per-user purge is a prefix delete.
  return `${ownerId}/${randomUUID()}.${ext}`;
}

function sign(key: string, expires: number): string {
  return createHmac("sha256", secret()).update(`${key}:${expires}`).digest("hex");
}

function signatureMatches(key: string, expires: number, provided: string): boolean {
  const expected = Buffer.from(sign(key, expires));
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export type UploadTarget = { url: string; key: string; expires: number };

/**
 * The local stand-in for a presigned PUT. The signature is what makes the
 * endpoint safe to expose: without it, any signed-in user could write to any
 * key. R2 gives you this property for free; here we do it ourselves.
 */
export function createUploadUrl(key: string): UploadTarget {
  const expires = Date.now() + UPLOAD_TTL_MS;
  const sig = sign(key, expires);
  const url = `/api/upload?key=${encodeURIComponent(key)}&expires=${expires}&sig=${sig}`;
  return { url, key, expires };
}

export function verifyUploadUrl(
  key: string,
  expires: number,
  sig: string,
): { ok: true } | { ok: false; error: string } {
  if (!isSafeKey(key)) return { ok: false, error: "Bad key" };
  if (!Number.isFinite(expires) || expires < Date.now()) {
    return { ok: false, error: "Upload link expired" };
  }
  if (!signatureMatches(key, expires, sig)) {
    return { ok: false, error: "Bad signature" };
  }
  return { ok: true };
}

export async function put(key: string, body: Buffer): Promise<void> {
  if (!isSafeKey(key)) throw new Error("Bad key");
  const target = path.join(ROOT, key);
  // Belt and braces: even with isSafeKey, never write outside the root.
  if (!target.startsWith(ROOT + path.sep)) throw new Error("Bad key");

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

export async function get(key: string): Promise<Buffer | null> {
  if (!isSafeKey(key)) return null;
  const target = path.join(ROOT, key);
  if (!target.startsWith(ROOT + path.sep)) return null;

  try {
    return await readFile(target);
  } catch {
    return null;
  }
}

/** Where the browser fetches the bytes from. Becomes the R2 custom domain later. */
export function publicUrl(key: string): string {
  return `/api/media/${key}`;
}
