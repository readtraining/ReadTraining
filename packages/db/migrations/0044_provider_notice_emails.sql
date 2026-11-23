ALTER TABLE "organisations" ADD COLUMN "order_email" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "refund_email" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD COLUMN "dispute_email" text;--> statement-breakpoint
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_notice_emails" CHECK ("organisations"."order_email" ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' and "organisations"."refund_email" ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' and "organisations"."dispute_email" ~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$');