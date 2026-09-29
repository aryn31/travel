CREATE TYPE "public"."story_status" AS ENUM('draft', 'published', 'unlisted');--> statement-breakpoint
CREATE TABLE "media" (
	"id" text PRIMARY KEY NOT NULL,
	"owner_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"blurhash" text,
	"alt" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" text PRIMARY KEY NOT NULL,
	"author_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"subtitle" text,
	"body_json" jsonb DEFAULT '{"type":"doc","content":[]}'::jsonb NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"cover_media_id" text,
	"status" "story_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp,
	"reading_minutes" integer DEFAULT 0 NOT NULL,
	"like_count" integer DEFAULT 0 NOT NULL,
	"comment_count" integer DEFAULT 0 NOT NULL,
	"place_name" text,
	"country_code" text,
	"lat" double precision,
	"lng" double precision,
	"search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(body_text, '')), 'B')) STORED,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "media" ADD CONSTRAINT "media_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_cover_media_id_media_id_fk" FOREIGN KEY ("cover_media_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "stories_author_slug_idx" ON "stories" USING btree ("author_id","slug");--> statement-breakpoint
CREATE INDEX "stories_published_idx" ON "stories" USING btree ("status","published_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "stories_author_updated_idx" ON "stories" USING btree ("author_id","updated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "stories_search_idx" ON "stories" USING gin ("search_vector");