CREATE TABLE "provider_faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organisation_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "provider_faqs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "provider_faqs" ADD CONSTRAINT "provider_faqs_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "provider_faqs_org_idx" ON "provider_faqs" USING btree ("organisation_id","position");--> statement-breakpoint
CREATE POLICY "provider_faqs: API only" ON "provider_faqs" AS RESTRICTIVE FOR ALL TO "anon", "authenticated" USING (false) WITH CHECK (false);