-- Shuts the auto-generated REST API out of the application's tables.
--
-- Supabase serves the `public` schema over PostgREST using the `anon` key,
-- which is public by design and meant to be shipped to browsers. Its own
-- default privileges had granted anon and authenticated SELECT, INSERT,
-- UPDATE, DELETE and TRUNCATE on every table here, with row-level security
-- off -- so that key alone would have read `users.password_hash`, read live
-- tokens out of `sessions` (which are the credential: paste one into a
-- cookie and you are that person), and truncated `stories`.
--
-- This app never uses the anon key. It connects as the database owner over
-- DATABASE_URL, which neither statement below affects.
--
-- Both halves are deliberate. The REVOKE is the fix. The ENABLE ROW LEVEL
-- SECURITY is what makes it stay fixed: Supabase's ALTER DEFAULT PRIVILEGES
-- re-grants on tables created later, and RLS with no policies denies by
-- default, so a future table is closed even if the grant comes back.
--
-- Guarded on the roles existing, so this is a no-op against a plain local
-- Postgres where `anon` was never created.
DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RAISE NOTICE 'no anon role: not a Supabase database, skipping';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY[
    'users', 'accounts', 'sessions', 'verification_tokens',
    'profiles', 'media', 'stories'
  ] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
