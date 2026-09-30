/**
 * Shared by the seeder and the password utility. Separate from seed.ts
 * because that module runs its main() on import.
 */
export const SEED_DOMAIN = "@seed.local";

/* Every seeded writer shares one obvious password so you can sign in as any
   of them without going near the terminal. Only ever reaches accounts under
   SEED_DOMAIN, which are wiped and rebuilt on every seed run.
 
   Shorter than MIN_PASSWORD on purpose: the seeder hashes directly rather
   than going through checkPassword, so this is settable here but would be
   rejected by the signup and change-password forms. Fine for throwaway
   local accounts; do not copy the pattern for a real one. */
export const SEED_PASSWORD = "12345678";
