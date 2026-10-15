-- Supabase-specific rules that drizzle-kit cannot express: helper functions, triggers, grants.
-- Helpers live in a `private` schema, which the Data API does not expose; every function is SECURITY DEFINER with an empty
-- search_path, so names are always schema-qualified.

CREATE SCHEMA IF NOT EXISTS private;--> statement-breakpoint
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;--> statement-breakpoint

-- 1. A profile for every sign-in --------------------------------------------------------------------------------------------
-- Email sign-up sends first_name / last_name / marketing_opt_in; Google and Facebook send full_name or name, and avatar_url
-- or picture. Missing names stay empty strings rather than failing the sign-up.
CREATE OR REPLACE FUNCTION private.create_profile(uid uuid, meta jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  full_name text := btrim(coalesce(meta->>'full_name', meta->>'name', ''));
  first_part text := split_part(full_name, ' ', 1);
  rest text := btrim(substr(full_name, length(first_part) + 1));
  opted_in boolean := lower(coalesce(meta->>'marketing_opt_in', 'false')) IN ('true', 't', '1', 'yes');
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, avatar_url, marketing_opt_in, marketing_opt_in_at)
  VALUES (
    uid,
    coalesce(nullif(btrim(meta->>'first_name'), ''), first_part, ''),
    coalesce(nullif(btrim(meta->>'last_name'), ''), rest, ''),
    nullif(coalesce(meta->>'avatar_url', meta->>'picture', ''), ''),
    opted_in,
    CASE WHEN opted_in THEN now() END
  )
  ON CONFLICT (id) DO NOTHING;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION private.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.create_profile(new.id, coalesce(new.raw_user_meta_data, '{}'::jsonb));
  RETURN new;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.handle_new_user();--> statement-breakpoint

-- accounts that existed before this migration get their profile too
SELECT private.create_profile(u.id, coalesce(u.raw_user_meta_data, '{}'::jsonb)) FROM auth.users u;--> statement-breakpoint

-- 2. updated_at ---------------------------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  new.updated_at := now();
  RETURN new;
END;
$$;--> statement-breakpoint

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER organisations_updated_at BEFORE UPDATE ON public.organisations FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint
CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON public.admin_users FOR EACH ROW EXECUTE FUNCTION private.set_updated_at();--> statement-breakpoint

-- 3. A member's role must fit the organisation type ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.check_member_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  org_type public.organisation_type;
BEGIN
  SELECT o.type INTO org_type FROM public.organisations o WHERE o.id = new.organisation_id;
  IF org_type = 'business' AND new.role NOT IN ('owner', 'member') THEN
    RAISE EXCEPTION 'Role % is not a business role', new.role USING ERRCODE = 'check_violation';
  END IF;
  IF org_type = 'provider' AND new.role = 'member' THEN
    RAISE EXCEPTION 'Role member is not a provider role' USING ERRCODE = 'check_violation';
  END IF;
  RETURN new;
END;
$$;--> statement-breakpoint

CREATE TRIGGER organisation_members_role_fits
  BEFORE INSERT OR UPDATE OF role, organisation_id ON public.organisation_members
  FOR EACH ROW EXECUTE FUNCTION private.check_member_role();--> statement-breakpoint

-- 4. The activity log is append-only ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.block_log_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'activity_log is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint

CREATE TRIGGER activity_log_no_update_delete BEFORE UPDATE OR DELETE ON public.activity_log FOR EACH ROW EXECUTE FUNCTION private.block_log_change();--> statement-breakpoint
CREATE TRIGGER activity_log_no_truncate BEFORE TRUNCATE ON public.activity_log FOR EACH STATEMENT EXECUTE FUNCTION private.block_log_change();--> statement-breakpoint

-- 5. Grants ----------------------------------------------------------------------------------------------------------------------
-- Functions are never callable through the Data API.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;--> statement-breakpoint
-- Writes only go through the API (which connects as postgres). Signed-in users may only read what the RLS policies allow;
-- the staff and log tables are not reachable through the Data API at all.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.profiles, public.organisations, public.organisation_members, public.posts FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON public.admin_users, public.activity_log FROM anon, authenticated;--> statement-breakpoint
REVOKE ALL ON public.profiles, public.organisations, public.organisation_members, public.posts FROM anon;
