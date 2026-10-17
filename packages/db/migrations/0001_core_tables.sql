CREATE TYPE "public"."actor_identity" AS ENUM('student', 'business', 'provider', 'admin', 'system');--> statement-breakpoint
CREATE TYPE "public"."admin_preset" AS ENUM('full', 'support', 'finance', 'custom');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'tutor', 'course_editor', 'support', 'sales', 'accounts', 'marketing', 'assistant', 'member');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('invited', 'active');--> statement-breakpoint
CREATE TYPE "public"."organisation_status" AS ENUM('pending', 'changes_requested', 'active', 'suspended', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."organisation_type" AS ENUM('business', 'provider');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "activity_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1),
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_user_id" uuid,
	"actor_identity" "actor_identity" NOT NULL,
	"organisation_id" uuid,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip" text
);
--> statement-breakpoint
ALTER TABLE "activity_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_users" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"preset" "admin_preset" DEFAULT 'custom' NOT NULL,
	"permissions" text[] DEFAULT '{}'::text[] NOT NULL,
	"refund_limit_pence" integer DEFAULT 10000 NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organisation_members" (
	"organisation_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" NOT NULL,
	"status" "member_status" DEFAULT 'active' NOT NULL,
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organisation_members_organisation_id_user_id_pk" PRIMARY KEY("organisation_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "organisation_members" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "organisations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "organisation_type" NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"mobile" text,
	"status" "organisation_status" DEFAULT 'pending' NOT NULL,
	"terms_accepted_at" timestamp with time zone,
	"terms_version" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organisations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"first_name" text DEFAULT '' NOT NULL,
	"last_name" text DEFAULT '' NOT NULL,
	"avatar_url" text,
	"date_of_birth" date,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"postcode" text,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"marketing_opt_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_organisation_id_organisations_id_fk" FOREIGN KEY ("organisation_id") REFERENCES "public"."organisations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisation_members" ADD CONSTRAINT "organisation_members_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organisations" ADD CONSTRAINT "organisations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_log_at_idx" ON "activity_log" USING btree ("at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_log_actor_idx" ON "activity_log" USING btree ("actor_user_id","at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "activity_log_target_idx" ON "activity_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "activity_log_action_idx" ON "activity_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "admin_users_created_by_idx" ON "admin_users" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "organisation_members_user_idx" ON "organisation_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organisation_members_invited_by_idx" ON "organisation_members" USING btree ("invited_by");--> statement-breakpoint
CREATE UNIQUE INDEX "organisation_members_one_owner" ON "organisation_members" USING btree ("organisation_id") WHERE "organisation_members"."role" = 'owner';--> statement-breakpoint
CREATE UNIQUE INDEX "organisations_slug_key" ON "organisations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "organisations_created_by_idx" ON "organisations" USING btree ("created_by");--> statement-breakpoint
CREATE POLICY "organisation_members: read own" ON "organisation_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "organisation_members"."user_id");--> statement-breakpoint
CREATE POLICY "organisations: read where member" ON "organisations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.organisation_members m where m.organisation_id = "organisations"."id" and m.user_id = (select auth.uid())));--> statement-breakpoint
CREATE POLICY "profiles: read own" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select auth.uid()) = "profiles"."id");