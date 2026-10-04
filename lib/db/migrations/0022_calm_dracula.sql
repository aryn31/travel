CREATE TABLE "account_deletions" (
	"user_id" text PRIMARY KEY NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account_deletions" ADD CONSTRAINT "account_deletions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- New table in `public`, so Supabase's default privileges hand anon full
-- access and RLS starts off -- see migration 0007. This one holds the code
-- that erases an account.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.account_deletions FROM anon, authenticated;
    ALTER TABLE public.account_deletions ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
