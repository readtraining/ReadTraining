CREATE TYPE "public"."review_source" AS ENUM('imported', 'booking');--> statement-breakpoint
CREATE TYPE "public"."review_status" AS ENUM('pending', 'published', 'hidden');--> statement-breakpoint
ALTER TABLE "reviews" ALTER COLUMN "reviewed_on" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "source" "review_source" DEFAULT 'imported' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "status" "review_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "review_date" date;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "date_is_approximate" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "order_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "course_id" integer;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "provider_id" uuid;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "provider_reply" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "provider_replied_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "origin" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD COLUMN "origin_url" text;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_provider_id_organisations_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."organisations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_status_idx" ON "reviews" USING btree ("status","review_date" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_order_key" ON "reviews" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "reviews_course_idx" ON "reviews" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "reviews_provider_idx" ON "reviews" USING btree ("provider_id");--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_order" CHECK ("reviews"."order_id" is null or "reviews"."source" = 'booking');--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_origin_length" CHECK ("reviews"."origin" is null or char_length("reviews"."origin") between 1 and 40);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_origin_url" CHECK ("reviews"."origin_url" is null or ("reviews"."origin" is not null and "reviews"."origin_url" ~ '^https://' and char_length("reviews"."origin_url") <= 500));--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reply_length" CHECK ("reviews"."provider_reply" is null or char_length("reviews"."provider_reply") between 1 and 2000);--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reply_date" CHECK (("reviews"."provider_reply" is null) = ("reviews"."provider_replied_at" is null));--> statement-breakpoint
-- carry the old published flag into status (the old worked-out dates are not copied: review_date stays empty)
UPDATE "reviews" SET "status" = CASE WHEN "published" THEN 'published'::"review_status" ELSE 'hidden'::"review_status" END;
