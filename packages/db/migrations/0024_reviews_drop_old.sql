DROP INDEX "reviews_published_idx";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "reviewed_on";--> statement-breakpoint
ALTER TABLE "reviews" DROP COLUMN "published";