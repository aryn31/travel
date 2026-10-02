import { get, isSafeKey, usingSupabase } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/**
 * Serves bytes from the local disk driver, and only that driver.
 *
 * This endpoint takes a storage key from the URL and returns whatever is at
 * it, with no session check -- which is the right shape for local
 * development, where the alternative is signing every image request, and
 * the wrong shape for anything else: it is an unauthenticated read of
 * arbitrary keys, including images attached to unpublished drafts.
 *
 * Once STORAGE_DRIVER is supabase, `publicUrl()` points at the bucket and
 * nothing generates these URLs any more, so the route is dead code that
 * still answers. Dead code that answers is how a hole outlives the feature
 * that justified it -- so it refuses outright rather than being left to be
 * found later. It also kept bytes flowing through the app server, which
 * PLAN.md 4.3 exists to prevent.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
  // Not an error page: to anything probing, this route simply does not
  // exist when the bucket is serving.
  if (usingSupabase()) return new Response("Not found", { status: 404 });

  const { key: segments } = await params;
  const key = segments.join("/");

  if (!isSafeKey(key)) return new Response("Not found", { status: 404 });

  const bytes = await get(key);
  if (!bytes) return new Response("Not found", { status: 404 });

  const ext = key.split(".").pop() ?? "";
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      // Keys are content-addressed by uuid and never rewritten, so a variant
      // can be cached indefinitely.
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(bytes.byteLength),
    },
  });
}
