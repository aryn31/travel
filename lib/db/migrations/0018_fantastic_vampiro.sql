CREATE TABLE "saves" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"story_id" text,
	"collection_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "saves_one_target" CHECK (("saves"."story_id" is null) <> ("saves"."collection_id" is null))
);
--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "saves" ADD CONSTRAINT "saves_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "saves_user_idx" ON "saves" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "saves_one_per_story_idx" ON "saves" USING btree ("user_id","story_id") WHERE "saves"."story_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "saves_one_per_collection_idx" ON "saves" USING btree ("user_id","collection_id") WHERE "saves"."collection_id" is not null;--> statement-breakpoint
-- New table in `public`, so Supabase's default privileges hand anon full
-- access and RLS starts off -- see migration 0007. A save is private by
-- design, which makes a readable `saves` table a reading history anyone
-- could download.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.saves FROM anon, authenticated;
    ALTER TABLE public.saves ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;
