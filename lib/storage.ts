import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { isSafeKey, publicUrl } from "./media-url";

// Re-exported so callers have one storage import, as before.
export { isSafeKey, publicUrl };

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
function localUploadUrl(key: string): UploadTarget {
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

async function localPut(key: string, body: Buffer): Promise<void> {
  if (!isSafeKey(key)) throw new Error("Bad key");
  const target = path.join(ROOT, key);
  // Belt and braces: even with isSafeKey, never write outside the root.
  if (!target.startsWith(ROOT + path.sep)) throw new Error("Bad key");

  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, body);
}

async function localGet(key: string): Promise<Buffer | null> {
  if (!isSafeKey(key)) return null;
  const target = path.join(ROOT, key);
  if (!target.startsWith(ROOT + path.sep)) return null;

  try {
    return await readFile(target);
  } catch {
    return null;
  }
}

async function localRemove(key: string): Promise<void> {
  if (!isSafeKey(key)) return;
  const target = path.join(ROOT, key);
  if (!target.startsWith(ROOT + path.sep)) return;
  // force: a missing file is the desired end state either way.
  await rm(target, { force: true });
}

/* ------------------------------------------------------------------ *
 * Supabase Storage
 *
 * Spoken to over its REST API rather than through @supabase/supabase-js:
 * that package bundles realtime, auth and postgrest clients this app does
 * not use, and the four calls below are the whole surface area.
 *
 * The service_role key bypasses every storage policy, so it is read here
 * and nowhere else -- lib/media-url.ts holds the half that is safe to ship
 * to a browser.
 * ------------------------------------------------------------------ */

type SupabaseConfig = { url: string; key: string; bucket: string };

function supabaseConfig(): SupabaseConfig {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_BUCKET;

  if (!url || !key || !bucket) {
    throw new Error(
      "STORAGE_DRIVER=supabase needs SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_BUCKET",
    );
  }
  return { url: url.replace(/\/+$/, ""), key, bucket };
}

function serviceHeaders(cfg: SupabaseConfig): Record<string, string> {
  return { apikey: cfg.key, Authorization: `Bearer ${cfg.key}` };
}

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

function contentTypeFor(key: string): string {
  return CONTENT_TYPE_BY_EXT[key.split(".").pop() ?? ""] ?? "application/octet-stream";
}

/**
 * A real presigned upload. The browser PUTs the blob straight to Supabase,
 * so the bytes never pass through this server -- which is the property
 * PLAN.md 4.3 asked for and the local driver could only imitate.
 */
async function supabaseUploadUrl(key: string): Promise<UploadTarget> {
  if (!isSafeKey(key)) throw new Error("Bad key");
  const cfg = supabaseConfig();

  const response = await fetch(
    `${cfg.url}/storage/v1/object/upload/sign/${cfg.bucket}/${key}`,
    { method: "POST", headers: serviceHeaders(cfg) },
  );
  if (!response.ok) {
    throw new Error(`Could not sign upload (${response.status})`);
  }

  // Returns a path like /object/upload/sign/<bucket>/<key>?token=…
  const { url: signed } = (await response.json()) as { url: string };
  return {
    url: `${cfg.url}/storage/v1${signed}`,
    key,
    // Supabase sets its own expiry on the token; this is for the caller's
    // benefit only, and is deliberately shorter than the token's life.
    expires: Date.now() + UPLOAD_TTL_MS,
  };
}

async function supabasePut(key: string, body: Buffer): Promise<void> {
  if (!isSafeKey(key)) throw new Error("Bad key");
  const cfg = supabaseConfig();

  const response = await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${key}`, {
    method: "POST",
    headers: {
      ...serviceHeaders(cfg),
      /* Informational only: Supabase derives the type it serves from the
         file extension and ignores this header, which is why the key's
         extension has to be truthful (see scripts/fix-media-keys.ts). */
      "Content-Type": contentTypeFor(key),
      // Re-running a migration or a seed should overwrite, not fail.
      "x-upsert": "true",
    },
    body: new Uint8Array(body),
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${await response.text()}`);
  }
}

async function supabaseGet(key: string): Promise<Buffer | null> {
  if (!isSafeKey(key)) return null;
  const cfg = supabaseConfig();

  const response = await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${key}`, {
    headers: serviceHeaders(cfg),
  });
  if (!response.ok) return null;
  return Buffer.from(await response.arrayBuffer());
}

async function supabaseRemove(key: string): Promise<void> {
  if (!isSafeKey(key)) return;
  const cfg = supabaseConfig();

  // A missing object is the desired end state either way, so a 404 is fine.
  await fetch(`${cfg.url}/storage/v1/object/${cfg.bucket}/${key}`, {
    method: "DELETE",
    headers: serviceHeaders(cfg),
  });
}

/* ------------------------------------------------------------------ *
 * Driver selection
 *
 * Read per call rather than once at module load: the migration script has
 * to reach both drivers in the same process.
 * ------------------------------------------------------------------ */

export function usingSupabase(): boolean {
  return (process.env.STORAGE_DRIVER ?? "local") === "supabase";
}

export async function createUploadUrl(key: string): Promise<UploadTarget> {
  return usingSupabase() ? supabaseUploadUrl(key) : localUploadUrl(key);
}

export async function put(key: string, body: Buffer): Promise<void> {
  return usingSupabase() ? supabasePut(key, body) : localPut(key, body);
}

export async function get(key: string): Promise<Buffer | null> {
  return usingSupabase() ? supabaseGet(key) : localGet(key);
}

export async function remove(key: string): Promise<void> {
  return usingSupabase() ? supabaseRemove(key) : localRemove(key);
}

/** Explicit access to each driver, for moving files from one to the other. */
export const drivers = {
  local: { put: localPut, get: localGet, remove: localRemove },
  supabase: { put: supabasePut, get: supabaseGet, remove: supabaseRemove },
};
