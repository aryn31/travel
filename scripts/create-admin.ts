// Env comes from --env-file (see the npm script).
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import { profiles, users } from "../lib/db/schema";
import { checkPassword, hashPassword } from "../lib/password";
import { normalizeHandle } from "../lib/handles";

/**
 * Makes a separate account that exists only to administer the site.
 *
 *   npm run admin:create -- admin@example.com
 *   npm run admin:create -- admin@example.com --handle=wendfolk-admin
 *   npm run admin:create -- admin@example.com --password=…
 *
 * Without --password one is generated, which is the better default. A
 * supplied one is still held to the same minimum the signup form enforces
 * -- an administrator is the last account that should be allowed to skip
 * the site's own rules.
 *
 * Separate from your writing account on purpose. The two want different
 * things: a writing account is one you stay signed in to on a phone, and
 * an administrative one is the account that can take other people's work
 * down. Keeping them apart means a stolen session cookie from the first
 * is not the second.
 *
 * The password is generated here and written to a file rather than
 * printed, so it does not end up in a terminal scrollback, a screen
 * recording, or whatever is reading over your shoulder.
 */
const OUT = ".admin-credentials";

/**
 * 24 bytes of base64url -- roughly 192 bits.
 *
 * Deliberately not a memorable passphrase: nobody should be typing this
 * from memory. It goes into a password manager once and is never seen
 * again.
 */
function strongPassword(): string {
  return randomBytes(24).toString("base64url");
}

async function main() {
  const args = process.argv.slice(2);
  const email = args.find((a) => !a.startsWith("--"))?.toLowerCase().trim();
  const wantedHandle =
    args.find((a) => a.startsWith("--handle="))?.slice("--handle=".length) ??
    "admin";
  const supplied = args
    .find((a) => a.startsWith("--password="))
    ?.slice("--password=".length);

  if (!email || !email.includes("@")) {
    console.error("\n  Usage: npm run admin:create -- admin@example.com\n");
    process.exit(1);
  }

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existing) {
    console.error(`\n  ${email} already has an account.`);
    console.error(`  To make it an admin instead: npm run admin -- ${email}\n`);
    process.exit(1);
  }

  const handle = normalizeHandle(wantedHandle);
  if (!handle.ok) {
    console.error(`\n  Bad handle: ${handle.error}\n`);
    process.exit(1);
  }

  const [clash] = await db
    .select({ handle: profiles.handle })
    .from(profiles)
    .where(eq(profiles.handle, handle.handle))
    .limit(1);
  if (clash) {
    console.error(`\n  The handle @${handle.handle} is taken. Pass --handle=…\n`);
    process.exit(1);
  }

  const password = supplied ?? strongPassword();

  const rules = checkPassword(password);
  if (!rules.ok) {
    console.error(`\n  That password won't do: ${rules.error}\n`);
    process.exit(1);
  }

  const [user] = await db
    .insert(users)
    .values({
      email,
      passwordHash: await hashPassword(password),
      role: "admin",
      /*
       * Verified on creation. The signup OTP exists to prove somebody owns
       * the address they typed; whoever can run this already has the
       * database.
       */
      emailVerified: new Date(),
    })
    .returning({ id: users.id });

  /*
   * A profile too, not just an account. The header only shows the admin
   * links to a viewer who has one, so an account without a profile can
   * reach /admin by URL and sees no way in.
   */
  await db.insert(profiles).values({
    userId: user.id,
    handle: handle.handle,
    displayName: "Wendfolk",
    bio: null,
  });

  /*
   * Only a generated password is written out. One the operator chose is
   * already theirs; copying it to a second place on disk would make it
   * easier to leak, not easier to find.
   */
  if (!supplied) {
    writeFileSync(
      OUT,
      [
        "# Wendfolk administrator account.",
        "# Put this in a password manager and delete this file.",
        "# Gitignored, but it is still a password sitting on a disk.",
        "",
        `email:    ${email}`,
        `password: ${password}`,
        `handle:   @${handle.handle}`,
        "",
      ].join("\n"),
      { mode: 0o600 },
    );
  }

  console.log(`\n  Created ${email} as admin, @${handle.handle}.`);
  console.log(
    supplied
      ? `  Using the password you supplied -- not echoed here.`
      : `  The password is in ${OUT} -- not printed here on purpose.\n  Move it into a password manager and delete the file.`,
  );
  console.log("");
  process.exit(0);
}

main();
