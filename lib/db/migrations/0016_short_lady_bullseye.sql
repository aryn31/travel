CREATE TYPE "public"."report_reason" AS ENUM('spam', 'abuse', 'copyright', 'other');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('open', 'upheld', 'dismissed');--> statement-breakpoint
CREATE TABLE "reports" (
	"id" text PRIMARY KEY NOT NULL,
	"reporter_id" text NOT NULL,
	"story_id" text,
	"comment_id" text,
	"reason" "report_reason" NOT NULL,
	"detail" text,
	"status" "report_status" DEFAULT 'open' NOT NULL,
	"resolved_by" text,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "reports_one_target" CHECK (("reports"."story_id" is null) <> ("reports"."comment_id" is null))
);
--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "removed_at" timestamp;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "removed_by" text;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_users_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_comment_id_comments_id_fk" FOREIGN KEY ("comment_id") REFERENCES "public"."comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reports_status_idx" ON "reports" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "reports_one_per_story_idx" ON "reports" USING btree ("reporter_id","story_id") WHERE "reports"."story_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_one_per_comment_idx" ON "reports" USING btree ("reporter_id","comment_id") WHERE "reports"."comment_id" is not null;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- New table in `public`, so Supabase's default privileges hand anon full
-- access and RLS starts off -- see migration 0007. This one records who
-- complained about whom, which is the last thing to leave readable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.reports FROM anon, authenticated;
    ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
