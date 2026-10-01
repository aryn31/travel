// Env comes from --env-file (see the npm script).
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { media } from "../lib/db/schema";
import { drivers } from "../lib/storage";

/**
 * Copies every file referenced by a `media` row from local disk into the
 * Supabase bucket.
 *
 * Keys are unchanged, so no database row is touched -- `media.storage_key`
 * already holds the only identifier either driver needs, and `publicUrl()`
 * derives the rest. That is the whole point of having stored a key rather
 * than a URL.
 *
 * Safe to re-run: uploads use x-upsert, and anything already present and
 * the right size is skipped.
 */
const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  const rows = await db
    .select({ key: media.storageKey, bytes: media.bytes })
    .from(media);

  console.log(`${rows.length} media rows${DRY_RUN ? " (dry run)" : ""}\n`);

  let copied = 0;
  let skipped = 0;
  let corrected = 0;
  const missing: string[] = [];
  const failed: string[] = [];

  for (const row of rows) {
    const local = await drivers.local.get(row.key);
    if (!local) {
      // A row whose file is gone: the seeder repairs these, so it is worth
      // reporting rather than silently copying nothing.
      missing.push(row.key);
      continue;
    }

    // Skip only when the object is already there AND the row agrees with
    // it. A row whose recorded size is stale still needs correcting, even
    // though the bytes themselves are identical.
    const existing = await drivers.supabase.get(row.key);
    if (
      existing &&
      existing.byteLength === local.byteLength &&
      row.bytes === local.byteLength
    ) {
      skipped++;
      continue;
    }

    if (DRY_RUN) {
      console.log(`  would copy ${row.key} (${local.byteLength} bytes)`);
      copied++;
      continue;
    }

    try {
      await drivers.supabase.put(row.key, local);
      copied++;

      // The row's recorded size is the one the app reports; make it true.
      if (local.byteLength !== row.bytes) {
        await db
          .update(media)
          .set({ bytes: local.byteLength })
          .where(eq(media.storageKey, row.key));
        corrected++;
      }
      process.stdout.write(`\r  copied ${copied}/${rows.length}`);
    } catch (err) {
      failed.push(`${row.key}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(`\n\ncopied ${copied}, already present ${skipped}` +
    (corrected > 0 ? `, corrected ${corrected} stale byte counts` : ""));
  if (missing.length > 0) {
    console.log(`\n${missing.length} rows have no local file:`);
    for (const k of missing) console.log(`  ${k}`);
  }
  if (failed.length > 0) {
    console.log(`\n${failed.length} failed:`);
    for (const f of failed) console.log(`  ${f}`);
    process.exitCode = 1;
  }
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
