ALTER TYPE "public"."notification_kind" ADD VALUE 'removed';--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'restored';--> statement-breakpoint
ALTER TABLE "reports" DROP CONSTRAINT "reports_one_target";--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "removed_at" timestamp;--> statement-breakpoint
ALTER TABLE "collections" ADD COLUMN "removed_by" text;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "collection_id" text;--> statement-breakpoint
ALTER TABLE "reports" ADD COLUMN "collection_id" text;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_removed_by_users_id_fk" FOREIGN KEY ("removed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reports_one_per_collection_idx" ON "reports" USING btree ("reporter_id","collection_id") WHERE "reports"."collection_id" is not null;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_one_target" CHECK ((
        (case when "reports"."story_id" is null then 0 else 1 end)
        + (case when "reports"."comment_id" is null then 0 else 1 end)
        + (case when "reports"."collection_id" is null then 0 else 1 end)
      ) = 1);