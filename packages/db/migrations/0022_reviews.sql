CREATE TABLE "reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_name" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"reviewed_on" date NOT NULL,
	"topic" text,
	"on_home" boolean DEFAULT false NOT NULL,
	"published" boolean DEFAULT false NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_rating_range" CHECK ("reviews"."rating" between 1 and 5),
	CONSTRAINT "reviews_name_length" CHECK (char_length("reviews"."reviewer_name") between 1 and 60),
	CONSTRAINT "reviews_body_length" CHECK (char_length("reviews"."body") between 10 and 2000),
	CONSTRAINT "reviews_topic_format" CHECK ("reviews"."topic" is null or "reviews"."topic" ~ '^[a-z0-9-]+(/[a-z0-9-]+){0,2}$')
);
--> statement-breakpoint
ALTER TABLE "reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "reviews_created_by_idx" ON "reviews" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "reviews_published_idx" ON "reviews" USING btree ("published","reviewed_on" DESC NULLS LAST);