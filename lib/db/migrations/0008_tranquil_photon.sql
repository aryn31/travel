CREATE TABLE "password_reset_tokens" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "password_reset_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
-- A new table in `public` inherits Supabase's default privileges, so anon
-- gets full access again and RLS starts off -- precisely the hole migration
-- 0007 closed for the tables that existed then. This one holds password
-- reset token hashes, so it is not a table to leave open.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.password_reset_tokens FROM anon, authenticated;
    ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
