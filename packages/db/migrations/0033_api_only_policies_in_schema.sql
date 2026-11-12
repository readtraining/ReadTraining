-- The "<table>: API only" policies made by migration 0025 are now written in schema.ts too (`apiOnly`), so drizzle-kit knows
-- them: a `db:push` or a later `db:generate` no longer sees them as extra and drops them. They already exist wherever 0025 ran
-- (every database), so this only makes any that are missing, and changes nothing otherwise.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_log', 'admin_users', 'categories', 'cohorts', 'coupons', 'course_exams', 'course_faqs', 'course_images',
    'course_levels', 'course_revisions', 'course_units', 'courses', 'delivery_methods', 'disputes', 'ledger_entries', 'orders',
    'payouts', 'platform_settings', 'posts', 'refunds', 'reviews', 'site_content', 'site_content_versions', 'subcategories',
    'topics', 'venues'
  ] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = t AND policyname = t || ': API only') THEN
      EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t || ': API only', t);
    END IF;
  END LOOP;
END $$;
