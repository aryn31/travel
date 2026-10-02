// Env comes from --env-file (see the npm script).
import { eq, isNull, like, and } from "drizzle-orm";
import { db } from "../lib/db";
import { profiles, users } from "../lib/db/schema";
import { put, remove } from "../lib/storage";
import { avatarPng } from "./photo";
import { SEED_DOMAIN } from "./seed-config";
import { requireLocalDatabase } from "./guard";

/**
 * Gives every seeded writer a profile photo.
 *
 * Separate from `npm run seed` so it can run against an existing database
 * without re-downloading the Commons photographs, same as seed:auth.
 *
 * `--force` replaces photos that are already set; by default only writers
 * without one are touched, so a photo uploaded by hand survives a re-run.
 * `--clear` removes them again, files included.
 */
const FORCE = process.argv.includes("--force");
const CLEAR = process.argv.includes("--clear");
const SIZE = 512;

/**
 * Puts the seeded writers back to their signature fallback.
 *
 * Deletes the file as well as the column: an avatar key lives nowhere else
 * -- not in a media row, not in a story body -- so nulling the column alone
 * would strand the object in the bucket with nothing left pointing at it.
 */
async function clear() {
  const rows = await db
    .select({ userId: profiles.userId, handle: profiles.handle, key: profiles.avatarKey })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(like(users.email, `%${SEED_DOMAIN}`));

  let cleared = 0;
  for (const row of rows) {
    if (!row.key) continue;
    await db
      .update(profiles)
      .set({ avatarKey: null, updatedAt: new Date() })
      .where(eq(profiles.userId, row.userId));
    try {
      await remove(row.key);
    } catch {
      /* the column is already null; a stranded file is the lesser problem */
    }
    console.log(`  @${row.handle.padEnd(9)} removed`);
    cleared++;
  }
  console.log(
    cleared > 0
      ? `\n${cleared} profile photos removed -- these writers sign their name now`
      : "No seeded profile photos to remove.",
  );
}

async function main() {
  // Writes files and rewrites profile rows; local only unless told otherwise.
  requireLocalDatabase("seed:avatars");

  if (CLEAR) return clear();

  const where = FORCE
    ? like(users.email, `%${SEED_DOMAIN}`)
    : and(like(users.email, `%${SEED_DOMAIN}`), isNull(profiles.avatarKey));

  const rows = await db
    .select({ userId: profiles.userId, handle: profiles.handle, email: users.email })
    .from(profiles)
    .innerJoin(users, eq(users.id, profiles.userId))
    .where(where);

  if (rows.length === 0) {
    console.log(
      FORCE
        ? `No ${SEED_DOMAIN} accounts found. Run \`npm run seed\` first.`
        : "Every seeded writer already has a photo. Use --force to replace them.",
    );
    return;
  }

  for (const row of rows) {
    // Seeded from the handle, so a writer keeps the same portrait across
    // re-runs and two writers never collide.
    const seed = [...row.handle].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
    const bytes = avatarPng(SIZE, seed);

    const key = `${row.userId}/${crypto.randomUUID()}.png`;
    await put(key, bytes);

    await db
      .update(profiles)
      .set({ avatarKey: key, updatedAt: new Date() })
      .where(eq(profiles.userId, row.userId));

    console.log(`  @${row.handle.padEnd(9)} ${(bytes.byteLength / 1024).toFixed(1)} KB`);
  }

  console.log(`\n${rows.length} profile photos written`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
