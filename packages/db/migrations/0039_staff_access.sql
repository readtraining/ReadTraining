CREATE TABLE "staff_access" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_user_id" uuid NOT NULL,
	"organisation_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"ended_how" text,
	"told_at" timestamp with time zone,
	CONSTRAINT "staff_access_reason" CHECK (length(btrim("staff_access"."reason")) between 3 and 300)
);
--> statement-breakpoint
ALTER TABLE "staff_access" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "staff_access" ADD CONSTRAINT "staff_access_admin_user_id_users_id_fk" FOREIGN KEY ("admin_user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_access" ADD CONSTRAINT "staff_access_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "staff_access_admin_idx" ON "staff_access" USING btree ("admin_user_id");--> statement-breakpoint
CREATE INDEX "staff_access_organisation_idx" ON "staff_access" USING btree ("organisation_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "staff_access_one_open" ON "staff_access" USING btree ("admin_user_id") WHERE "staff_access"."ended_at" is null;--> statement-breakpoint
CREATE POLICY "staff_access: API only" ON "staff_access" AS RESTRICTIVE FOR ALL TO "anon", "authenticated" USING (false) WITH CHECK (false);