// Env comes from --env-file (see the npm script).
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { profiles, users } from "../lib/db/schema";

/**
 * The bootstrap.
 *
 * Roles are managed from /admin/people, which only an admin can open --
 * so the first one cannot be made there. This is the way in, and it is
 * deliberately a command on the server rather than a page: anything that
 * can mint an administrator over HTTP is the most valuable endpoint on
 * the site.
 *
 *   npm run admin -- you@example.com            promote to admin
 *   npm run admin -- you@example.com editor     promote to editor
 *   npm run admin -- you@example.com user       demote
 *   npm run admin                               list who already has a role
 *
 * No local-database guard, unlike the seed scripts: granting yourself
 * access to your own production site is the entire point, and the thing
 * this replaces is a hand-typed UPDATE against the same database.
 */
const ROLES = ["user", "editor", "admin"] as const;
type Role = (typeof ROLES)[number];

async function list() {
  const rows = await db
    .select({
      email: users.email,
      role: users.role,
      handle: profiles.handle,
    })
    .from(users)
    .leftJoin(profiles, eq(profiles.userId, users.id));

  const staff = rows.filter((r) => r.role !== "user");
  if (staff.length === 0) {
    console.log("\n  Nobody has a role yet. Grant one:\n");
    console.log("    npm run admin -- you@example.com\n");
    return;
  }

  console.log(`\n  ${staff.length} with a role:\n`);
  for (const s of staff) {
    console.log(`    ${s.role.padEnd(6)}  ${s.email}${s.handle ? `  @${s.handle}` : ""}`);
  }
  console.log(`\n  ${rows.length - staff.length} ordinary accounts.\n`);
}

async function main() {
  const [email, roleArg] = process.argv.slice(2);

  if (!email) {
    await list();
    process.exit(0);
  }

  const role = (roleArg ?? "admin") as Role;
  if (!ROLES.includes(role)) {
    console.error(`\n  Unknown role "${role}". One of: ${ROLES.join(", ")}\n`);
    process.exit(1);
  }

  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);

  if (!user) {
    console.error(`\n  No account with the email ${email}.`);
    console.error(`  They have to sign up first; this only changes a role.\n`);
    process.exit(1);
  }

  if (user.role === role) {
    console.log(`\n  ${email} is already ${role}. Nothing to do.\n`);
    process.exit(0);
  }

  await db.update(users).set({ role }).where(eq(users.id, user.id));
  console.log(`\n  ${email}: ${user.role} → ${role}\n`);
  process.exit(0);
}

main();
