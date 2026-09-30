/*
 * In-memory attempt limiter for the password endpoints.
 *
 * Deliberately not Redis: this is a single-process local app, and a real
 * deployment behind more than one instance needs a shared store anyway
 * (PLAN.md 10). What it does buy, right now, is that a password field is not
 * an unlimited guessing oracle -- which is worth having even locally,
 * because the alternative is shipping it and remembering later.
 *
 * Keyed by email rather than IP: without a proxy in front there is no
 * trustworthy client address in local development, and locking the account
 * being attacked is the half that actually protects the account.
 */
type Bucket = { count: number; first: number; until: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const LOCKOUT_MS = 15 * 60 * 1000;
/* Unbounded growth would be a slow leak in a long-running process; the map
   is swept whenever it gets large rather than on a timer. */
const SWEEP_AT = 5000;

function sweep(now: number) {
  for (const [key, b] of buckets) {
    if (b.until < now && b.first + WINDOW_MS < now) buckets.delete(key);
  }
}

export type Throttle =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/** Call before doing the work. Does not itself record a failure. */
export function check(key: string): Throttle {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b) return { allowed: true };

  if (b.until > now) {
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((b.until - now) / 1000),
    };
  }
  return { allowed: true };
}

/** Records a failed attempt, locking the key once the window fills. */
export function fail(key: string) {
  const now = Date.now();
  if (buckets.size > SWEEP_AT) sweep(now);

  const b = buckets.get(key);
  if (!b || b.first + WINDOW_MS < now) {
    buckets.set(key, { count: 1, first: now, until: 0 });
    return;
  }

  b.count += 1;
  if (b.count >= MAX_ATTEMPTS) {
    b.until = now + LOCKOUT_MS;
    b.count = 0;
    b.first = now;
  }
}

/** Clears the record for a key after a success. */
export function succeed(key: string) {
  buckets.delete(key);
}
