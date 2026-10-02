import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "./db";
import { passwordResetTokens } from "./db/schema";

/**
 * Reset links: issuing, checking and spending them.
 *
 * The token is 32 random bytes, base64url. Only its SHA-256 reaches the
 * database, so the plaintext exists in the email and nowhere else -- a
 * leaked table is then a list of useless hashes rather than a set of keys
 * to every account. No salt and no slow KDF here on purpose: the input is
 * already 256 bits of entropy, so there is nothing to brute-force and
 * nothing a work factor would buy.
 */
const TTL_MS = 60 * 60 * 1000;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issues a link for a user, invalidating any they already had.
 *
 * Returns the plaintext, which the caller must put in an email and then
 * forget -- it is never recoverable again.
 */
export async function issueToken(userId: string): Promise<string> {
  // One live link per person. Asking twice should not leave the first one
  // working, or a forwarded old email stays dangerous.
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));

  const token = randomBytes(32).toString("base64url");
  await db.insert(passwordResetTokens).values({
    tokenHash: hashToken(token),
    userId,
    expires: new Date(Date.now() + TTL_MS),
  });

  // Expired rows for other people are dead weight; clear them opportunistically
  // rather than running a scheduled job for a table this small.
  await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expires, new Date()));

  return token;
}

export type TokenCheck =
  | { ok: true; userId: string }
  | { ok: false; reason: "invalid" | "expired" };

/**
 * Looks a token up without confirming or denying anything to a caller who
 * guessed. The comparison is constant-time even though the lookup is by
 * primary key -- cheap, and it keeps the habit.
 */
export async function checkToken(token: string): Promise<TokenCheck> {
  if (!token) return { ok: false, reason: "invalid" };

  const hash = hashToken(token);
  const [row] = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hash))
    .limit(1);

  if (!row) return { ok: false, reason: "invalid" };

  const a = Buffer.from(row.tokenHash);
  const b = Buffer.from(hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "invalid" };
  }

  if (row.expires.getTime() < Date.now()) {
    // Clean it up on the way past; it will never be valid again.
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.tokenHash, hash));
    return { ok: false, reason: "expired" };
  }

  return { ok: true, userId: row.userId };
}

/** Burns a token. Call after the password is actually changed, not before. */
export async function spendToken(token: string): Promise<void> {
  await db
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashToken(token)));
}
