import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

/**
 * One-time codes for proving an email address belongs to whoever typed it.
 *
 * Six digits is a million possibilities, which is a lot for a person and
 * nothing for a script -- so the strength here is not the code, it is the
 * three limits around it: a short life, a hard cap on attempts, and the
 * code dying on the first wrong guess past that cap. Lengthening the code
 * would annoy every honest user to inconvenience nobody else.
 */
export { CODE_LENGTH } from "./otp-rules";
import { CODE_LENGTH } from "./otp-rules";

export const TTL_MS = 10 * 60 * 1000;
export const MAX_ATTEMPTS = 5;

/** `randomInt`, not `Math.random()`: this is a credential, however short. */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/*
 * Plain SHA-256, no salt or work factor. Against a leaked database a slow
 * KDF would buy very little on a six-digit input -- a million scrypt
 * hashes is minutes, not years -- so the real defence stays the attempt
 * cap and the ten-minute window. What hashing does buy is that a casual
 * read of the table does not hand over live codes.
 */
export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function codeMatches(code: string, storedHash: string): boolean {
  const a = Buffer.from(hashCode(code));
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Accepts "123 456" and "123-456" -- people paste what they see. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function codeEmail(code: string) {
  const spaced = `${code.slice(0, 3)} ${code.slice(3)}`;
  return {
    subject: `${code} is your Wendfolk code`,
    text: [
      "Here is the code to finish creating your Wendfolk account:",
      "",
      `    ${spaced}`,
      "",
      "It expires in ten minutes.",
      "",
      "If you didn't try to sign up, you can ignore this — no account has",
      "been created, and nobody can create one with this address without",
      "this code.",
    ].join("\n"),
    html: `
      <div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:32rem;line-height:1.6;color:#191310">
        <p>Here is the code to finish creating your Wendfolk account:</p>
        <p style="margin:1.75rem 0;font-family:ui-monospace,monospace;font-size:2rem;font-weight:600;letter-spacing:0.18em">
          ${spaced}
        </p>
        <p style="color:#6a5c50;font-size:0.875rem">It expires in ten minutes.</p>
        <p style="color:#6a5c50;font-size:0.875rem">
          If you didn't try to sign up, you can ignore this — no account has been
          created, and nobody can create one with this address without this code.
        </p>
      </div>`,
  };
}
