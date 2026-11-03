-- public.rls_auto_enable() is Supabase's own helper behind the `ensure_rls` event trigger (it turns RLS on for every new table;
-- Supabase adds it when a project is created with that option). It was created callable by anyone, so the Security Advisor
-- flags it ("Public / Signed-In Users Can Execute SECURITY DEFINER Function"). Nobody could really call it (Postgres refuses to
-- run an event-trigger function directly), but the Data API roles have no reason to hold the right, so it is taken away. The
-- event trigger keeps working: Postgres runs it itself, not as those roles. A project made without that option has no such
-- function, so this does nothing there.
DO $$
BEGIN
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;
