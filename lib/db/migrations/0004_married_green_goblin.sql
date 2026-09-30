ALTER TABLE "stories" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "stories" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(place_name, '')), 'A') || setweight(to_tsvector('english', coalesce(body_text, '')), 'B')) STORED;--> statement-breakpoint
-- Dropping the column dropped its index with it. Drizzle does not emit this
-- because the index definition itself never changed, so it is added by hand.
CREATE INDEX IF NOT EXISTS "stories_search_idx" ON "stories" USING gin ("search_vector");
