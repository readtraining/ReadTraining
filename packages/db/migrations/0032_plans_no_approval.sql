ALTER TABLE "price_plans" DROP CONSTRAINT "price_plans_tiers_shape";--> statement-breakpoint
ALTER TABLE "price_plans" DROP CONSTRAINT "price_plans_draft_shape";--> statement-breakpoint
ALTER TABLE "price_plans" DROP CONSTRAINT "price_plans_has_version";--> statement-breakpoint
-- plans need no approval any more: the latest version saved (a change that was waiting, or else the approved one) is what learners see
UPDATE "price_plans" SET "tiers" = coalesce("draft", "tiers");--> statement-breakpoint
-- and every date and self-paced course on a plan is priced at its cheapest package again (with that package's was-price)
WITH "cheapest" AS (SELECT DISTINCT ON (p."id") p."id", (t->>'pricePence')::int AS "price", CASE WHEN coalesce((t->>'savePence')::int, 0) > 0 THEN (t->>'pricePence')::int + (t->>'savePence')::int END AS "was" FROM "price_plans" p, jsonb_array_elements(p."tiers") t ORDER BY p."id", (t->>'pricePence')::int) UPDATE "cohorts" k SET "price_pence" = c."price", "was_price_pence" = c."was" FROM "cheapest" c WHERE k."plan_id" = c."id";--> statement-breakpoint
WITH "cheapest" AS (SELECT DISTINCT ON (p."id") p."id", (t->>'pricePence')::int AS "price" FROM "price_plans" p, jsonb_array_elements(p."tiers") t ORDER BY p."id", (t->>'pricePence')::int) UPDATE "courses" c SET "price_pence" = x."price" FROM "cheapest" x WHERE c."plan_id" = x."id";--> statement-breakpoint
ALTER TABLE "price_plans" DROP CONSTRAINT "price_plans_submitted_by_users_id_fk";
--> statement-breakpoint
ALTER TABLE "price_plans" DROP CONSTRAINT "price_plans_decided_by_users_id_fk";
--> statement-breakpoint
DROP INDEX "price_plans_status_idx";--> statement-breakpoint
DROP INDEX "price_plans_submitted_by_idx";--> statement-breakpoint
DROP INDEX "price_plans_decided_by_idx";--> statement-breakpoint
ALTER TABLE "price_plans" ALTER COLUMN "tiers" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "price_plans" DROP COLUMN "draft";--> statement-breakpoint
ALTER TABLE "price_plans" DROP COLUMN "status";--> statement-breakpoint
ALTER TABLE "price_plans" DROP COLUMN "status_note";--> statement-breakpoint
ALTER TABLE "price_plans" DROP COLUMN "submitted_at";--> statement-breakpoint
ALTER TABLE "price_plans" DROP COLUMN "submitted_by";--> statement-breakpoint
ALTER TABLE "price_plans" DROP COLUMN "decided_at";--> statement-breakpoint
ALTER TABLE "price_plans" DROP COLUMN "decided_by";--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_packages_shape" CHECK (jsonb_typeof("price_plans"."tiers") = 'array' and jsonb_array_length("price_plans"."tiers") between 2 and 4);--> statement-breakpoint
DROP TYPE "public"."price_plan_status";