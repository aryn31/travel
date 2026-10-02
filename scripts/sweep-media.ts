// Env comes from --env-file (see the npm script).
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { media, stories } from "../lib/db/schema";
import { keyFromSrc } from "../lib/media-url";
import { imageUrls } from "../lib/story-doc";
import { findBucketStrays, findStrays, sweep } from "../lib/media-gc";
import { remove } from "../lib/storage";

/**
 * Finds and removes stored images nothing points at any more.
 *
 * Saving a story now reconciles its own images, so this is for what built
 * up before that existed, and for strays: uploads recorded against a story
 * that was abandoned or deleted before anything referenced them.
 *
 * `--dry-run` reports without deleting.
 */
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  // 1. Anything already past its grace period.
  const swept = DRY_RUN ? 0 : await sweep();
  if (swept > 0) console.log(`swept ${swept} already-marked images`);

  // 2. Rows whose story no longer references them -- the backlog.
  const all = await db
    .select({ id: media.id, key: media.storageKey, storyId: media.storyId, bytes: media.bytes })
    .from(media);
  const docs = await db
    .select({ id: stories.id, body: stories.bodyJson, cover: stories.coverMediaId })
    .from(stories);

  const referencedKeys = new Set<string>();
  const referencedIds = new Set<string>();
  for (const d of docs) {
    for (const src of imageUrls(d.body)) {
      const k = keyFromSrc(src);
      if (k) referencedKeys.add(k);
    }
    if (d.cover) referencedIds.add(d.cover);
  }

  const strayIds = new Set((await findStrays()).map((s) => s.id));
  const orphans = all.filter(
    (m) => !referencedKeys.has(m.key) && !referencedIds.has(m.id),
  );

  if (orphans.length === 0) {
    console.log("No orphaned media rows — every row is referenced.");
    await sweepBucket();
    return;
  }

  const kb = (orphans.reduce((n, o) => n + o.bytes, 0) / 1024).toFixed(0);
  console.log(`${orphans.length} orphaned images, ${kb} KB${DRY_RUN ? " (dry run)" : ""}`);

  for (const o of orphans) {
    const why = strayIds.has(o.id) ? "no story" : "removed from its story";
    console.log(`  ${(o.bytes / 1024).toFixed(0).padStart(5)} KB  ${why.padEnd(22)} ${o.key}`);
    if (DRY_RUN) continue;

    // File first: a row without a file is a visible broken image, a file
    // without a row is invisible and permanent.
    await remove(o.key);
    await db.delete(media).where(eq(media.id, o.id));
  }

  if (!DRY_RUN) console.log(`\nremoved ${orphans.length} images, reclaimed ${kb} KB`);

  await sweepBucket();
}

/**
 * The second kind of orphan: a file in the bucket with nothing in the
 * database pointing at it. Invisible to everything row-driven, because
 * there is no row to start from.
 */
async function sweepBucket() {
  const strays = await findBucketStrays();
  if (strays === null) {
    console.log("\n(bucket scan skipped — not using the Supabase driver)");
    return;
  }
  if (strays.length === 0) {
    console.log("\nBucket is clean: every stored file is accounted for.");
    return;
  }

  const kb = (strays.reduce((n, s) => n + s.bytes, 0) / 1024).toFixed(0);
  console.log(`\n${strays.length} files in the bucket with no database row, ${kb} KB${DRY_RUN ? " (dry run)" : ""}`);
  for (const s of strays) {
    console.log(`  ${(s.bytes / 1024).toFixed(0).padStart(5)} KB  ${s.key}`);
    if (!DRY_RUN) await remove(s.key);
  }
  if (!DRY_RUN) console.log(`removed ${strays.length} files, reclaimed ${kb} KB`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
