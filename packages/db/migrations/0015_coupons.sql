CREATE TYPE "public"."coupon_kind" AS ENUM('percent', 'amount');--> statement-breakpoint
CREATE TYPE "public"."coupon_scope" AS ENUM('all', 'categories', 'courses');--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"kind" "coupon_kind" NOT NULL,
	"value" integer NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"usage_limit" integer,
	"used" integer DEFAULT 0 NOT NULL,
	"scope" "coupon_scope" DEFAULT 'all' NOT NULL,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"courses" integer[] DEFAULT '{}'::integer[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "coupons_code_format" CHECK ("coupons"."code" ~ '^[A-Z0-9][A-Z0-9-]{2,29}$'),
	CONSTRAINT "coupons_value_range" CHECK (("coupons"."kind" = 'percent' and "coupons"."value" between 1 and 100) or ("coupons"."kind" = 'amount' and "coupons"."value" between 1 and 10000000)),
	CONSTRAINT "coupons_dates_order" CHECK ("coupons"."starts_at" is null or "coupons"."ends_at" is null or "coupons"."starts_at" < "coupons"."ends_at"),
	CONSTRAINT "coupons_limit_positive" CHECK ("coupons"."usage_limit" is null or "coupons"."usage_limit" > 0),
	CONSTRAINT "coupons_used_positive" CHECK ("coupons"."used" >= 0)
);
--> statement-breakpoint
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "coupons_code_key" ON "coupons" USING btree ("code");--> statement-breakpoint
CREATE INDEX "coupons_created_by_idx" ON "coupons" USING btree ("created_by");