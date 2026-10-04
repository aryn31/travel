CREATE TABLE "collection_stories" (
	"collection_id" text NOT NULL,
	"story_id" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "collection_stories_collection_id_story_id_pk" PRIMARY KEY("collection_id","story_id")
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text,
	"status" "story_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collection_stories" ADD CONSTRAINT "collection_stories_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_stories" ADD CONSTRAINT "collection_stories_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "collection_stories_order_idx" ON "collection_stories" USING btree ("collection_id","position");--> statement-breakpoint
CREATE INDEX "collection_stories_story_idx" ON "collection_stories" USING btree ("story_id");--> statement-breakpoint
CREATE UNIQUE INDEX "collections_owner_slug_idx" ON "collections" USING btree ("owner_id","slug");--> statement-breakpoint
CREATE INDEX "collections_owner_idx" ON "collections" USING btree ("owner_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
-- New tables in `public`, so Supabase's default privileges hand anon full
-- access and RLS starts off -- see migration 0007.
DO $$
DECLARE
  t text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    RAISE NOTICE 'no anon role: not a Supabase database, skipping';
    RETURN;
  END IF;

  FOREACH t IN ARRAY ARRAY['collections', 'collection_stories'] LOOP
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END
$$;
