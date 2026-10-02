CREATE TABLE "pending_signups" (
	"email" text PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- New table in `public`, so Supabase's default privileges hand anon full
-- access and RLS starts off -- see migration 0007. This one holds password
-- hashes for signups in flight, so it is not a table to leave open.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.pending_signups FROM anon, authenticated;
    ALTER TABLE public.pending_signups ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
