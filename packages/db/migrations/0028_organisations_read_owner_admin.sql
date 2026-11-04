-- Only the organisation's active owner and admins read its row through the Data API (its mobile, commission, terms and our
-- status note are private; a tutor, an assistant or someone only invited gets what they need through the API). IF EXISTS: a
-- development copy may already have the policy under its new name from before.
DROP POLICY IF EXISTS "organisations: read where member" ON "organisations" CASCADE;--> statement-breakpoint
DROP POLICY IF EXISTS "organisations: read where owner or admin" ON "organisations" CASCADE;--> statement-breakpoint
CREATE POLICY "organisations: read where owner or admin" ON "organisations" AS PERMISSIVE FOR SELECT TO "authenticated" USING (exists (select 1 from public.organisation_members m where m.organisation_id = "organisations"."id" and m.user_id = (select auth.uid()) and m.role in ('owner', 'admin') and m.status = 'active'));
