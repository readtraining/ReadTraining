-- Tables only the API reads and writes. The API connects as postgres (it bypasses RLS and these grants); the browser never
-- reads a table with the public key (it calls the API). Until now these tables had RLS on with no policy, which already
-- refused every row, but signed-in users still held a SELECT grant on most of them (Supabase's default for new tables), and
-- Supabase's Security Advisor flagged each one. Now, two locks, both saying the same thing:
--   1. no grants at all for anon or authenticated on these tables, and new tables start with none (a table the browser should
--      read must grant SELECT to authenticated in its own migration, with an owner-only policy, as profiles does);
--   2. an explicit "API only" policy on each table, refusing every row to anon and authenticated, so the intent is written down
--      in the database itself.
-- profiles, organisations and organisation_members keep their owner-only read policies and SELECT grant (0001, 0003).

-- 1. Grants: none for the Data API roles on API-only tables, now and for tables made later --------------------------------------
REVOKE ALL ON TABLE
  public.activity_log, public.admin_users, public.categories, public.cohorts, public.coupons, public.course_exams,
  public.course_faqs, public.course_images, public.course_levels, public.course_revisions, public.course_units, public.courses,
  public.delivery_methods, public.disputes, public.ledger_entries, public.orders, public.payouts, public.platform_settings,
  public.posts, public.refunds, public.reviews, public.site_content, public.site_content_versions, public.subcategories,
  public.topics, public.venues
FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;--> statement-breakpoint

-- 2. The written-down rule: every row refused to the Data API roles -----------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'activity_log', 'admin_users', 'categories', 'cohorts', 'coupons', 'course_exams', 'course_faqs', 'course_images',
    'course_levels', 'course_revisions', 'course_units', 'courses', 'delivery_methods', 'disputes', 'ledger_entries', 'orders',
    'payouts', 'platform_settings', 'posts', 'refunds', 'reviews', 'site_content', 'site_content_versions', 'subcategories',
    'topics', 'venues'
  ] LOOP
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO anon, authenticated USING (false) WITH CHECK (false)', t || ': API only', t);
  END LOOP;
END $$;
