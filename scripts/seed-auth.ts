// Env comes from --env-file (see the npm script).
import { like } from "drizzle-orm";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";
import { hashPassword } from "../lib/password";
import { SEED_DOMAIN, SEED_PASSWORD } from "./seed-config";

/**
 * Gives every seeded account the shared dev password, without touching the
 * stories or re-fetching a single photograph.
 *
 * `npm run seed` does this too, but a full seed re-downloads ~29 images from
 * Wikimedia Commons under a rate limit -- far too much work for what is a
 * one-column update.
 */
async function main() {
  const passwordHash = await hashPassword(SEED_PASSWORD);

  const rows = await db
    .update(users)
    .set({ passwordHash })
    .where(like(users.email, `%${SEED_DOMAIN}`))
    .returning({ email: users.email });

  if (rows.length === 0) {
    console.log(`No ${SEED_DOMAIN} accounts found. Run \`npm run seed\` first.`);
    return;
  }

  console.log(`Password set on ${rows.length} seeded accounts: ${SEED_PASSWORD}`);
  for (const r of rows) console.log(`  ${r.email}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
