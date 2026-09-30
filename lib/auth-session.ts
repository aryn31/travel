import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";

/*
 * Auth.js v5's Credentials provider only works with the JWT session
 * strategy, and this app deliberately uses database sessions (auth.ts) --
 * a row that can be deleted is what makes "sign out everywhere" and instant
 * revocation possible at all.
 *
 * So password sign-in writes the session itself rather than going through
 * signIn(). The contract is small and stable: a random token in the
 * `sessions` table, and the same cookie Auth.js reads. Everything after
 * that -- auth(), getViewer(), the adapter's own lookup -- is unchanged,
 * because a session created this way is indistinguishable from one the
 * magic link created.
 *
 * Cookie name and options mirror @auth/core's defaultCookies(); the
 * `__Secure-` prefix and the secure flag only apply over HTTPS, which is
 * why they key off the configured URL rather than NODE_ENV (a production
 * build served over http:// locally must still be able to sign in).
 */
const SESSION_DAYS = 30;

function secureCookies() {
  return (process.env.AUTH_URL ?? "").startsWith("https://");
}

export function sessionCookieName() {
  return `${secureCookies() ? "__Secure-" : ""}authjs.session-token`;
}

/** Signs the user in: one session row, one cookie. */
export async function createSession(userId: string) {
  const sessionToken = randomUUID();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.insert(sessions).values({ sessionToken, userId, expires });

  const jar = await cookies();
  jar.set(sessionCookieName(), sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: secureCookies(),
    expires,
  });

  return { sessionToken, expires };
}

/**
 * Drops the current session row and its cookie. Auth.js's own signOut()
 * handles the link-based sessions; this exists for the paths that created a
 * session directly, and for invalidating the old one after a password
 * change.
 */
export async function destroySession() {
  const jar = await cookies();
  const name = sessionCookieName();
  const token = jar.get(name)?.value;

  if (token) await db.delete(sessions).where(eq(sessions.sessionToken, token));
  jar.delete(name);
}

/**
 * Deletes every session a user has except, optionally, the one they are
 * holding. Used after a password change: whoever knew the old password
 * should not keep a live session.
 */
export async function revokeOtherSessions(userId: string) {
  const jar = await cookies();
  const keep = jar.get(sessionCookieName())?.value;

  const rows = await db
    .select({ token: sessions.sessionToken })
    .from(sessions)
    .where(eq(sessions.userId, userId));

  for (const row of rows) {
    if (row.token === keep) continue;
    await db.delete(sessions).where(eq(sessions.sessionToken, row.token));
  }
}
