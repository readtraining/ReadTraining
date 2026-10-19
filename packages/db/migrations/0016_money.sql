CREATE TYPE "public"."dispute_status" AS ENUM('open', 'won', 'lost');--> statement-breakpoint
CREATE TYPE "public"."ledger_type" AS ENUM('purchase', 'refund', 'cancel', 'dispute', 'charge', 'adjust', 'payout');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('paid', 'part_refunded', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('card', 'bnpl', 'invoice', 'payment_link', 'free');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('draft', 'approved', 'held', 'sent');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('requested', 'approved', 'declined');--> statement-breakpoint
CREATE TABLE "disputes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_pence" integer NOT NULL,
	"reason" text NOT NULL,
	"evidence_due" date NOT NULL,
	"status" "dispute_status" DEFAULT 'open' NOT NULL,
	"opened_by" uuid,
	"closed_by" uuid,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "disputes_amount_positive" CHECK ("disputes"."amount_pence" > 0)
);
--> statement-breakpoint
ALTER TABLE "disputes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "ledger_entries" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "ledger_entries_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"type" "ledger_type" NOT NULL,
	"provider_id" uuid NOT NULL,
	"order_id" uuid,
	"refund_id" uuid,
	"dispute_id" uuid,
	"payout_id" uuid,
	"gross_pence" integer DEFAULT 0 NOT NULL,
	"fee_pence" integer DEFAULT 0 NOT NULL,
	"commission_pence" integer DEFAULT 0 NOT NULL,
	"provider_pence" integer NOT NULL,
	"note" text,
	"created_by" uuid,
	CONSTRAINT "ledger_split_adds_up" CHECK ("ledger_entries"."gross_pence" = "ledger_entries"."fee_pence" + "ledger_entries"."commission_pence" + "ledger_entries"."provider_pence" or "ledger_entries"."type" in ('charge', 'adjust', 'payout'))
);
--> statement-breakpoint
ALTER TABLE "ledger_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"buyer_user_id" uuid,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"buyer_company" text,
	"provider_id" uuid NOT NULL,
	"course_id" integer NOT NULL,
	"course_title" text NOT NULL,
	"starts_on" date,
	"quantity" integer NOT NULL,
	"unit_pence" integer NOT NULL,
	"gross_pence" integer NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "order_status" DEFAULT 'paid' NOT NULL,
	"fee_bps" integer NOT NULL,
	"commission_bps" integer NOT NULL,
	"booked_by" uuid,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "orders_amounts" CHECK ("orders"."quantity" between 1 and 500 and "orders"."unit_pence" >= 0 and "orders"."gross_pence" = "orders"."unit_pence" * "orders"."quantity"),
	CONSTRAINT "orders_free_is_zero" CHECK (("orders"."method" = 'free') = ("orders"."gross_pence" = 0)),
	CONSTRAINT "orders_rates" CHECK ("orders"."fee_bps" between 0 and 2000 and "orders"."commission_bps" between 0 and 6000)
);
--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"provider_id" uuid NOT NULL,
	"period_end" date NOT NULL,
	"amount_pence" integer NOT NULL,
	"held_back_pence" integer DEFAULT 0 NOT NULL,
	"status" "payout_status" DEFAULT 'draft' NOT NULL,
	"hold_reason" text,
	"created_by" uuid,
	"approved_by" uuid,
	"approved_at" timestamp with time zone,
	"sent_by" uuid,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payouts_amounts" CHECK ("payouts"."amount_pence" > 0 and "payouts"."held_back_pence" >= 0),
	CONSTRAINT "payouts_second_approver" CHECK ("payouts"."approved_by" is null or "payouts"."created_by" is null or "payouts"."approved_by" <> "payouts"."created_by")
);
--> statement-breakpoint
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"amount_pence" integer NOT NULL,
	"reason" text NOT NULL,
	"status" "refund_status" DEFAULT 'requested' NOT NULL,
	"requested_by" uuid,
	"decided_by" uuid,
	"decided_at" timestamp with time zone,
	"decision_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refunds_amount_positive" CHECK ("refunds"."amount_pence" > 0)
);
--> statement-breakpoint
ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_opened_by_users_id_fk" FOREIGN KEY ("opened_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_user_id_users_id_fk" FOREIGN KEY ("buyer_user_id") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_provider_id_organisations_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."organisations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_booked_by_users_id_fk" FOREIGN KEY ("booked_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_provider_id_organisations_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."organisations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_decided_by_users_id_fk" FOREIGN KEY ("decided_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "disputes_order_idx" ON "disputes" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "disputes_status_idx" ON "disputes" USING btree ("status","evidence_due");--> statement-breakpoint
CREATE INDEX "disputes_opened_by_idx" ON "disputes" USING btree ("opened_by");--> statement-breakpoint
CREATE INDEX "disputes_closed_by_idx" ON "disputes" USING btree ("closed_by");--> statement-breakpoint
CREATE INDEX "ledger_provider_idx" ON "ledger_entries" USING btree ("provider_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "ledger_order_idx" ON "ledger_entries" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "ledger_payout_idx" ON "ledger_entries" USING btree ("payout_id");--> statement-breakpoint
CREATE INDEX "ledger_at_idx" ON "ledger_entries" USING btree ("at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "orders_ref_key" ON "orders" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "orders_provider_idx" ON "orders" USING btree ("provider_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "orders" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "orders_buyer_idx" ON "orders" USING btree ("buyer_user_id");--> statement-breakpoint
CREATE INDEX "orders_booked_by_idx" ON "orders" USING btree ("booked_by");--> statement-breakpoint
CREATE UNIQUE INDEX "payouts_ref_key" ON "payouts" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "payouts_provider_idx" ON "payouts" USING btree ("provider_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "payouts_status_idx" ON "payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "payouts_created_by_idx" ON "payouts" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "payouts_approved_by_idx" ON "payouts" USING btree ("approved_by");--> statement-breakpoint
CREATE INDEX "payouts_sent_by_idx" ON "payouts" USING btree ("sent_by");--> statement-breakpoint
CREATE INDEX "refunds_order_idx" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "refunds_status_idx" ON "refunds" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "refunds_requested_by_idx" ON "refunds" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "refunds_decided_by_idx" ON "refunds" USING btree ("decided_by");