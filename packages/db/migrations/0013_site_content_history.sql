CREATE TABLE "site_content_versions" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "site_content_versions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"saved_by" uuid,
	"saved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "site_content_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE INDEX "site_content_versions_key_idx" ON "site_content_versions" USING btree ("key","saved_at" DESC NULLS LAST);