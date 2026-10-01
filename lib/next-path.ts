/**
 * Validates a `?next=` destination.
 *
 * Anything that is not a plain in-app path is discarded. Without this the
 * parameter is an open redirect: `/signin?next=https://elsewhere.example`
 * would send someone off-site immediately after they typed a password,
 * which is exactly the shape of a credential-phishing flow.
 */
export function safeNext(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;

  const path = value.trim();
  // Must be absolute-within-the-app, and must not be protocol-relative
  // ("//evil.example" is a valid URL to a different host).
  if (!path.startsWith("/") || path.startsWith("//")) return fallback;
  // A backslash is treated as a slash by some parsers; don't hand it one.
  if (path.includes("\\")) return fallback;

  return path;
}
