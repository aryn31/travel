import { NextResponse } from "next/server";
import { getViewer } from "@/lib/session";
import { MAX_UPLOAD_BYTES, put, verifyUploadUrl } from "@/lib/storage";

/**
 * Stands in for a presigned R2 PUT. Two independent gates: a valid session,
 * and a signature this server issued for this exact key. The signature is the
 * one that matters -- it's what stops a signed-in user writing over somebody
 * else's key.
 */
export async function PUT(request: Request) {
  const viewer = await getViewer();
  if (!viewer) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const expires = Number(url.searchParams.get("expires"));
  const sig = url.searchParams.get("sig") ?? "";

  const check = verifyUploadUrl(key, expires, sig);
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 403 });
  }

  // The signed key is owner-prefixed, so this also pins the upload to the
  // user it was issued for.
  if (!key.startsWith(`${viewer.userId}/`)) {
    return NextResponse.json({ error: "Not your key" }, { status: 403 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.byteLength === 0) {
    return NextResponse.json({ error: "Empty body" }, { status: 400 });
  }
  if (body.byteLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "Too large" }, { status: 413 });
  }

  await put(key, body);
  return NextResponse.json({ ok: true });
}
