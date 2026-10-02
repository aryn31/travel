/**
 * The one OTP constant a browser needs.
 *
 * Split from lib/otp.ts for the same reason lib/password-rules.ts is split
 * from lib/password.ts: that module reaches for node:crypto at the top
 * level, so a client component importing a constant from it pulls `randomInt`
 * into the bundle and the page dies on module evaluation.
 */
export const CODE_LENGTH = 6;
