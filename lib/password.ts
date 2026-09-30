import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Re-exported so server code has one import for all of this; the rules
// themselves live apart so client components can read them safely.
export {
  MIN_PASSWORD,
  MAX_PASSWORD,
  PASSWORD_RULES,
  checkPassword,
  type PasswordCheck,
} from "./password-rules";

const scryptAsync = promisify(scrypt) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/*
 * scrypt from node:crypto rather than bcrypt or argon2: both of those are
 * native modules that have to compile per platform, and this project already
 * leans on node:crypto for the signed upload URLs. scrypt is memory-hard,
 * which is the property that matters against GPU cracking.
 *
 * N=2^15 costs roughly 100ms and 32MB per hash on a laptop -- slow enough to
 * make offline guessing expensive, fast enough that a sign-in still feels
 * instant. maxmem has to be raised explicitly or Node refuses at this N.
 */
const PARAMS = { N: 1 << 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEYLEN = 64;

/** `scrypt$N$r$p$salt$key`, all hex. Self-describing, so N can change later. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN, PARAMS);
  return [
    "scrypt",
    PARAMS.N,
    PARAMS.r,
    PARAMS.p,
    salt.toString("hex"),
    key.toString("hex"),
  ].join("$");
}

/**
 * Constant-time compare against a stored hash. Returns false rather than
 * throwing on a malformed record -- a corrupt row should fail the sign-in,
 * not the request.
 */
export async function verifyPassword(
  password: string,
  stored: string | null,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;

  const [, n, r, p, saltHex, keyHex] = parts;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(keyHex, "hex");
  if (salt.length === 0 || expected.length === 0) return false;

  try {
    const actual = await scryptAsync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: PARAMS.maxmem,
    });
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
