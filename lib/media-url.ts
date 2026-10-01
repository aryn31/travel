/**
 * Turning a storage key into a URL, and back again.
 *
 * Client-safe on purpose: `components/StoryBody.tsx` is imported by the
 * editor, which is a client component, so the renderer ends up in the
 * browser bundle and cannot read server-only config. Everything here is
 * derived from the project URL and bucket name, both of which appear in
 * every image URL anyway. The service_role key lives in lib/storage.ts and
 * never crosses this line.
 */

const LOCAL_PREFIX = "/api/media/";

/* Next inlines NEXT_PUBLIC_* at build time, so these must be read as whole
   property accesses -- process.env[name] with a computed key is not
   replaced and would be undefined in the browser. */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_BUCKET;

/** The public URL prefix for the configured bucket, or null on local disk. */
export function storagePrefix(): string | null {
  if (!SUPABASE_URL || !SUPABASE_BUCKET) return null;
  return `${SUPABASE_URL.replace(/\/+$/, "")}/storage/v1/object/public/${SUPABASE_BUCKET}/`;
}

/** Keys are user-supplied on the way back in, so they get validated, not trusted. */
export function isSafeKey(key: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]*\/[A-Za-z0-9_-]+\.[a-z]{3,4}$/.test(key);
}

/**
 * Recovers the storage key from a stored `src`.
 *
 * Story bodies carry whatever URL was current when the image was inserted,
 * so a single document can hold both `/api/media/…` from the local era and
 * a bucket URL from after the move. Resolving back to the key means the
 * renderer never has to care which, and a future change of provider needs
 * no data migration at all.
 *
 * Returns null for anything that is not one of our own shapes -- which is a
 * stricter allow-list than the prefix test it replaced, because the key has
 * to survive validation too.
 */
export function keyFromSrc(src: string): string | null {
  let key: string | null = null;

  if (src.startsWith(LOCAL_PREFIX)) {
    key = src.slice(LOCAL_PREFIX.length);
  } else {
    const prefix = storagePrefix();
    if (prefix && src.startsWith(prefix)) key = src.slice(prefix.length);
  }

  if (key === null) return null;
  // Drop any query string or fragment before validating.
  key = key.split(/[?#]/)[0];
  return isSafeKey(key) ? key : null;
}

/** Where the browser fetches the bytes from. */
export function publicUrl(key: string): string {
  const prefix = storagePrefix();
  return prefix ? `${prefix}${key}` : `${LOCAL_PREFIX}${key}`;
}
