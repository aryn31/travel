/**
 * The free-read meter for signed-out visitors.
 *
 * A soft wall, not an entitlement check. Stories are public content; the
 * point is to ask someone to sign in once they are clearly reading rather
 * than glancing, and every part of this is deliberately cheap: a cookie, no
 * database row, no account for anonymous readers.
 *
 * Kept free of `next/*` imports so both `proxy.ts` and the story page can
 * use it -- the proxy runs outside the app's render path and the docs are
 * explicit that it should not lean on shared app modules, so what crosses
 * that line is only this: the cookie name, the parser, and the rules.
 */
export const METER_COOKIE = "read";
export const METER_HEADER = "x-read-meter";

/** How many stories a signed-out reader gets before being asked to join. */
export const FREE_READS = 1;

const MAX_AGE_DAYS = 30;
/* One key is `handle/slug`. Bounded so a crafted cookie cannot grow
   unboundedly and so the header stays well inside any proxy limit. */
const MAX_KEY_LENGTH = 200;

/*
 * "bypass" means the proxy saw a session cookie and did not count the read.
 * It is not the same as the header being absent: absent means the proxy did
 * not run at all, and the page fails open rather than walling the whole
 * site on a matcher mistake. A stale cookie that no longer resolves to a
 * viewer lands on "bypass" with no viewer, which is a dead session -- and
 * asking that reader to sign in again is the right answer.
 */
export type MeterVerdict = "allowed" | "exhausted" | "bypass";

export function meterCookieOptions(): {
  httpOnly: true;
  sameSite: "lax";
  path: string;
  maxAge: number;
} {
  return {
    // The page reads this on the server; nothing in the browser needs it.
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_DAYS * 24 * 60 * 60,
  };
}

/** The meter's key for a story. Case-folded: URLs are matched that way too. */
export function storyKey(handle: string, slug: string): string {
  return `${handle.toLowerCase()}/${slug.toLowerCase()}`.slice(0, MAX_KEY_LENGTH);
}

export function parseMeter(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split("|")
    .map((k) => k.trim())
    .filter(Boolean)
    .slice(0, FREE_READS);
}

export function serializeMeter(keys: string[]): string {
  return keys.slice(0, FREE_READS).join("|");
}

/**
 * Decides what a signed-out reader gets, and what the cookie should become.
 *
 * Re-opening a story that was already spent stays free forever -- otherwise
 * a refresh, a back button, or following a link to the piece you are in the
 * middle of would all slam the wall shut on you.
 */
export function meter(
  read: string[],
  key: string,
): { verdict: MeterVerdict; next: string[] | null } {
  if (read.includes(key)) return { verdict: "allowed", next: null };
  if (read.length >= FREE_READS) return { verdict: "exhausted", next: null };
  return { verdict: "allowed", next: [...read, key] };
}
