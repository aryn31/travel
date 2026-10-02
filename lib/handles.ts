/**
 * Handles are the first path segment of every story URL (/@handle/slug), so
 * they share a namespace with our routes. Reserve anything we might ever
 * want to mount at the root -- taking one back later means breaking a user's
 * permalinks.
 */
const RESERVED = new Set([
  "about", "account", "admin", "api", "auth", "blog", "collections",
  "contact", "dashboard", "discover", "docs", "editor", "explore", "faq",
  "feed", "forgot", "help", "home", "jobs", "legal", "login", "logout",
  "map", "me", "new", "news", "notifications", "onboarding", "places",
  "press", "privacy", "profile", "public", "reset", "search", "settings",
  "signin", "signout", "signup", "static", "stories", "story", "support",
  "tags", "terms", "trips", "write", "www",
]);

export const HANDLE_RULES =
  "3-20 characters, lowercase letters, numbers and underscores only";

export type HandleCheck = { ok: true; handle: string } | { ok: false; error: string };

export function normalizeHandle(input: string): HandleCheck {
  const handle = input.trim().toLowerCase().replace(/^@/, "");

  if (handle.length < 3) return { ok: false, error: "Too short — at least 3 characters." };
  if (handle.length > 20) return { ok: false, error: "Too long — 20 characters max." };
  if (!/^[a-z0-9_]+$/.test(handle))
    return { ok: false, error: "Only lowercase letters, numbers and underscores." };
  if (/^[0-9_]/.test(handle))
    return { ok: false, error: "Must start with a letter." };
  if (RESERVED.has(handle)) return { ok: false, error: "That handle is reserved." };

  return { ok: true, handle };
}

/** Best-effort starting point for the handle field, from an email address. */
export function suggestHandle(email: string): string {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
  const trimmed = base.replace(/^[0-9_]+/, "").slice(0, 20);
  return trimmed.length >= 3 ? trimmed : "";
}
