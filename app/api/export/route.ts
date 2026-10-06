import { getViewer } from "@/lib/session";
import { buildExport, photographFiles } from "@/lib/export";
import { zipStream, type ZipFile } from "@/lib/zip";

/**
 * Downloads everything this account has, as a zip.
 *
 * A route rather than a Server Action: the point is a file the browser
 * saves, and an action returns a value to a React tree. Only ever the
 * signed-in account -- there is no parameter for whose data to build,
 * which is the simplest way to make sure the answer is always "yours".
 *
 * The archive holds the photographs themselves rather than links to them.
 * Bucket URLs work for anybody holding them, so an export full of links
 * was a file that handed out every photograph in it to whoever it was
 * forwarded to -- including those in drafts and private stories.
 */
export async function GET() {
  const viewer = await getViewer();
  if (!viewer) {
    return new Response("Sign in first.", { status: 401 });
  }

  const data = await buildExport(viewer.userId);
  if (!data) {
    return new Response("Nothing to export yet.", { status: 404 });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const name = `wendfolk-${data.account.handle}-${stamp}.zip`;

  async function* contents(): AsyncGenerator<ZipFile> {
    // The manifest first, so it is the thing somebody sees on opening.
    yield {
      name: "wendfolk.json",
      body: new TextEncoder().encode(JSON.stringify(data, null, 2)),
    };
    yield {
      name: "README.txt",
      body: new TextEncoder().encode(README),
    };
    yield* photographFiles(viewer!.userId);
  }

  return new Response(zipStream(contents()), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${name}"`,
      // Somebody else's copy of this is the last thing worth caching.
      "Cache-Control": "no-store",
    },
  });
}

/** Plain text, because the person opening this may not read JSON. */
const README = `Your Wendfolk archive
=====================

wendfolk.json   Everything you wrote: stories, trips, comments, likes
                and saves. Stories keep their full document, so nothing
                is lost -- images, links and pull quotes included.

photographs/    Every photograph you uploaded, as the file itself. The
                names match the "file" field of each entry in
                wendfolk.json.

This archive contains no links back to the site. The photographs are
here in full, so this file is the copy -- it keeps working whether or
not your account does.

Comments other people wrote on your stories are not included. They are
their words, not yours.
`;
