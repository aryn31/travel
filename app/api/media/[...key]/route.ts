import { get, isSafeKey } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

/**
 * Serves bytes from the local driver. In production this route disappears --
 * images come straight from a Cloudflare custom domain in front of R2, so
 * they never touch the app server (PLAN.md 4.3).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string[] }> },
) {
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
