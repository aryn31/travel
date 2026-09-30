/**
 * Profile field rules, shared by the server action and the form.
 *
 * Deliberately not in `app/settings/actions.ts`: a "use server" module may
 * only export async functions, so a plain constant exported from there
 * reaches the client as undefined -- silently, which cost a round of
 * "0/undefined" under the bio box and a set of missing maxLength attributes.
 */
export const LIMITS = {
  displayName: 50,
  bio: 280,
  website: 200,
  homeCountry: 60,
};

export type WebsiteCheck =
  | { ok: true; url: string }
  | { ok: false; error: string };

/**
 * Accepts what people actually type into a website box. A bare domain gets
 * https://, and only http(s) survives -- `javascript:` in a field that
 * becomes an anchor on a public page is the reason this is checked on the
 * way in rather than at render time.
 */
export function normalizeWebsite(input: string): WebsiteCheck {
  const raw = input.trim();
  if (!raw) return { ok: true, url: "" };
  if (raw.length > LIMITS.website) {
    return { ok: false, error: `${LIMITS.website} characters max.` };
  }

  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, error: "That does not look like a web address." };
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, error: "Only http and https links." };
  }
  // Catches "https://localhost" and bare words that URL() happily accepts.
  if (!url.hostname.includes(".")) {
    return { ok: false, error: "That does not look like a web address." };
  }

  return { ok: true, url: url.toString() };
}
