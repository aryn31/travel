ALTER TABLE "media" ADD COLUMN "story_id" text;--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "excerpt" text DEFAULT '' NOT NULL;