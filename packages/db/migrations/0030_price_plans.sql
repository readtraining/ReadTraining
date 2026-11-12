CREATE TYPE "public"."price_plan_status" AS ENUM('pending', 'approved', 'changes');--> statement-breakpoint
CREATE TABLE "price_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"name" text NOT NULL,
	"tiers" jsonb,
	"draft" jsonb,
	"status" "price_plan_status" DEFAULT 'pending' NOT NULL,
	"status_note" text,
	"submitted_at" timestamp with time zone,
	"submitted_by" uuid,
	"decided_at" timestamp with time zone,
	"decided_by" uuid,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "price_plans_name_length" CHECK (char_length("price_plans"."name") between 1 and 60),
	CONSTRAINT "price_plans_tiers_shape" CHECK ("price_plans"."tiers" is null or (jsonb_typeof("price_plans"."tiers") = 'array' and jsonb_array_length("price_plans"."tiers") between 2 and 4)),
	CONSTRAINT "price_plans_draft_shape" CHECK ("price_plans"."draft" is null or (jsonb_typeof("price_plans"."draft") = 'array' and jsonb_array_length("price_plans"."draft") between 2 and 4)),
	CONSTRAINT "price_plans_has_version" CHECK ("price_plans"."tiers" is not null or "price_plans"."draft" is not null)
);
--> statement-breakpoint
ALTER TABLE "price_plans" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cohorts" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "courses" ADD COLUMN "plan_id" uuid;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_submitted_by_users_id_fk" FOREIGN KEY ("submitted_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_plans" ADD CONSTRAINT "price_plans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "price_plans_organisation_idx" ON "price_plans" USING btree ("organisation_id");--> statement-breakpoint
CREATE INDEX "price_plans_status_idx" ON "price_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "price_plans_submitted_by_idx" ON "price_plans" USING btree ("submitted_by");--> statement-breakpoint
CREATE INDEX "price_plans_decided_by_idx" ON "price_plans" USING btree ("decided_by");--> statement-breakpoint
CREATE INDEX "price_plans_created_by_idx" ON "price_plans" USING btree ("created_by");--> statement-breakpoint
ALTER TABLE "cohorts" ADD CONSTRAINT "cohorts_plan_id_price_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."price_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_plan_id_price_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."price_plans"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cohorts_plan_idx" ON "cohorts" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "courses_plan_idx" ON "courses" USING btree ("plan_id");--> statement-breakpoint
CREATE POLICY "price_plans: API only" ON "price_plans" AS RESTRICTIVE FOR ALL TO "anon", "authenticated" USING (false) WITH CHECK (false);