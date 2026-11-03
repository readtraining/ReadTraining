CREATE TYPE "public"."closure_status" AS ENUM('open', 'withdrawn', 'done');--> statement-breakpoint
CREATE TABLE "account_closure_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"email" text NOT NULL,
	"reason" text,
	"status" "closure_status" DEFAULT 'open' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	CONSTRAINT "account_closure_reason_length" CHECK ("account_closure_requests"."reason" is null or char_length("account_closure_requests"."reason") <= 1000)
);
--> statement-breakpoint
ALTER TABLE "account_closure_requests" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE UNIQUE INDEX "account_closure_one_open" ON "account_closure_requests" USING btree ("user_id") WHERE "account_closure_requests"."status" = 'open';--> statement-breakpoint
CREATE INDEX "account_closure_status_idx" ON "account_closure_requests" USING btree ("status","requested_at");--> statement-breakpoint
CREATE POLICY "account_closure_requests: API only" ON "account_closure_requests" AS RESTRICTIVE FOR ALL TO "anon", "authenticated" USING (false) WITH CHECK (false);