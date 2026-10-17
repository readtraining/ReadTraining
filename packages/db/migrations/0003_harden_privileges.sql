-- Least privilege for the Data API roles. RLS stays the main guard; these grants are the second lock, so a table that ever
-- shipped without RLS would still not be readable or writable by the public key.

-- 1. Existing objects ---------------------------------------------------------------------------------------------------------
-- Signed-in users keep SELECT only (filtered by the RLS policies); they never need REFERENCES or TRIGGER.
REVOKE REFERENCES, TRIGGER ON public.profiles, public.organisations, public.organisation_members, public.posts FROM authenticated;--> statement-breakpoint
-- Identity / serial counters are only used by inserts, and inserts only happen through the API.
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;--> statement-breakpoint

-- 2. Future objects created by migrations (they run as postgres) --------------------------------------------------------------
-- Supabase's defaults give anon and authenticated every right on every new table, sequence and function. New tables now start
-- closed to anon and read-only for signed-in users, and new functions are not callable through the API unless granted.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;--> statement-breakpoint
-- Per-schema defaults can only add to the global ones, and PostgreSQL's global default lets PUBLIC execute every new
-- function, so that grant has to be removed globally. Functions meant for the API must now be granted explicitly.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
