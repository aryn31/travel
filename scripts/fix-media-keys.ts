// Env comes from --env-file (see the npm script).
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db";
import { media, stories } from "../lib/db/schema";
import { drivers, usingSupabase } from "../lib/storage";

/**
 * Renames media keys whose extension lies about their contents.
 *
 * Supabase serves a Content-Type derived from the file extension and
 * ignores whatever the upload sent, so a PNG stored under a `.webp` key is
 * served as `image/webp` forever. Browsers sniff and render it anyway,
 * which is exactly why this would otherwise go unnoticed.
 *
 * They got that way because seed.ts regenerates missing files as PNG at the
 * stored dimensions without renaming the key -- fixed at the source, but
 * the rows it already wrote still need correcting.
 *
 * Keys appear in two places: `media.storage_key`, and the `src` of image
 * nodes inside `stories.body_json`. Both are updated, and the bytes are
 * copied to the new key in whichever driver is active before the old one
 * goes.
 */
const DRY_RUN = process.argv.includes("--dry-run");

const MAGIC: [Buffer, string][] = [
  [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "png"],
  [Buffer.from([0xff, 0xd8, 0xff]), "jpg"],
];

function realExtension(b: Buffer): string | null {
  for (const [magic, ext] of MAGIC) {
    if (b.subarray(0, magic.length).equals(magic)) return ext;
  }
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") {
    return "webp";
  }
  return null;
}

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

async function main() {
  const driver = usingSupabase() ? drivers.supabase : drivers.local;
  console.log(
    `active driver: ${usingSupabase() ? "supabase" : "local"}${DRY_RUN ? " (dry run)" : ""}\n`,
  );

  const rows = await db
    .select({ id: media.id, key: media.storageKey })
    .from(media);

  let fixed = 0;

  for (const row of rows) {
    // Read from local disk: it is the copy that definitely still exists,
    // and the migration keeps the bucket in step with it.
    const bytes = (await drivers.local.get(row.key)) ?? (await driver.get(row.key));
    if (!bytes) continue;

    const actual = realExtension(bytes);
    const current = row.key.split(".").pop()!;
    if (!actual || actual === current) continue;

    const newKey = row.key.replace(/\.[a-z]+$/, `.${actual}`);
    console.log(`  ${current} -> ${actual}  ${newKey}`);
    if (DRY_RUN) {
      fixed++;
      continue;
    }

    // Write the new key everywhere before removing the old one, so a crash
    // in the middle leaves two copies rather than none.
    await drivers.local.put(newKey, bytes);
    if (usingSupabase()) await drivers.supabase.put(newKey, bytes);

    await db
      .update(media)
      .set({
        storageKey: newKey,
        mime: MIME_BY_EXT[actual],
        bytes: bytes.byteLength,
      })
      .where(eq(media.id, row.id));

    /*
     * Rewrite any image node in any story body that points at the old key.
     * Replacing the key rather than the whole URL on purpose: a body may
     * hold either `/api/media/<key>` or a bucket URL depending on when it
     * was written, and the key is the part common to both. Keys are uuids,
     * so there is nothing else in the document they could collide with.
     */
    await db.execute(sql`
      update ${stories}
      set body_json = replace(body_json::text, ${row.key}, ${newKey})::jsonb
      where body_json::text like ${"%" + row.key + "%"}
    `);

    await drivers.local.remove(row.key);
    if (usingSupabase()) await drivers.supabase.remove(row.key);
    fixed++;
  }

  console.log(fixed > 0 ? `\n${fixed} keys corrected` : "\nnothing to fix");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
