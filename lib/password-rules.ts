/**
 * The half of the password story that is safe in a browser.
 *
 * Split from lib/password.ts because that module reaches for node:crypto at
 * the top level: a client component importing a constant from it pulls
 * `scrypt` into the bundle, where it is undefined, and `promisify(scrypt)`
 * throws on module evaluation before the page renders at all.
 *
 * Nothing here touches crypto, so both sides can share it.
 */
export const MIN_PASSWORD = 10;

/* An unbounded password is an unbounded amount of hashing work handed to us
   by a stranger. (bcrypt's 72-byte limit is not scrypt's problem.) */
export const MAX_PASSWORD = 200;

export const PASSWORD_RULES = "At least 10 characters.";

export type PasswordCheck = { ok: true } | { ok: false; error: string };

export function checkPassword(password: string): PasswordCheck {
  if (password.length < MIN_PASSWORD) {
    return { ok: false, error: `Too short — ${MIN_PASSWORD} characters minimum.` };
  }
  if (password.length > MAX_PASSWORD) {
    return { ok: false, error: `Too long — ${MAX_PASSWORD} characters maximum.` };
  }
  // Nothing about mixed case or symbols: length is what actually helps, and
  // composition rules mostly produce "Password1!" and a sticky note.
  return { ok: true };
}
