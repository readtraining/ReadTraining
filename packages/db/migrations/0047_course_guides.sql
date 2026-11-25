CREATE TABLE "course_guides" (
	"course_id" integer PRIMARY KEY NOT NULL,
	"content" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid
);
--> statement-breakpoint
ALTER TABLE "course_guides" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "course_guides" ADD CONSTRAINT "course_guides_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "course_guides" ADD CONSTRAINT "course_guides_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "course_guides_updated_by_idx" ON "course_guides" USING btree ("updated_by");--> statement-breakpoint
CREATE POLICY "course_guides: API only" ON "course_guides" AS RESTRICTIVE FOR ALL TO "anon", "authenticated" USING (false) WITH CHECK (false);