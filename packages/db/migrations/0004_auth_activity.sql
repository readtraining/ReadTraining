-- Sign-up, log in, log out, email confirmation, password and email changes happen between the browser and Supabase Auth and
-- never pass through our API, so they are logged here, from Supabase's own tables. They can't be forged from a browser.
-- Logging must never stop anyone signing in: every trigger catches its own errors and only raises a warning.

CREATE OR REPLACE FUNCTION private.log_activity(actor uuid, identity public.actor_identity, action text, target_type text, target_id text, meta jsonb, ip text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.activity_log (actor_user_id, actor_identity, action, target_type, target_id, metadata, ip)
  VALUES (actor, identity, action, target_type, target_id, coalesce(meta, '{}'::jsonb), ip);
END;
$$;--> statement-breakpoint

-- Account events, from auth.users
CREATE OR REPLACE FUNCTION private.log_auth_user_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  uid text;
BEGIN
  BEGIN
    IF tg_op = 'DELETE' THEN
      PERFORM private.log_activity(NULL, 'system', 'auth.account_deleted', 'user', old.id::text, '{}'::jsonb, NULL);
      RETURN NULL;
    END IF;
    uid := new.id::text;
    IF tg_op = 'INSERT' THEN
      PERFORM private.log_activity(new.id, 'student', 'auth.signup', 'user', uid,
        jsonb_build_object('provider', coalesce(new.raw_app_meta_data->>'provider', 'email')), NULL);
      RETURN NULL;
    END IF;
    IF old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL THEN
      PERFORM private.log_activity(new.id, 'student', 'auth.email_confirmed', 'user', uid, '{}'::jsonb, NULL);
    END IF;
    IF new.recovery_sent_at IS NOT NULL AND new.recovery_sent_at IS DISTINCT FROM old.recovery_sent_at THEN
      PERFORM private.log_activity(new.id, 'student', 'auth.password_reset_requested', 'user', uid, '{}'::jsonb, NULL);
    END IF;
    IF new.encrypted_password IS DISTINCT FROM old.encrypted_password THEN
      PERFORM private.log_activity(new.id, 'student', 'auth.password_changed', 'user', uid, '{}'::jsonb, NULL);
    END IF;
    IF new.email_change_sent_at IS NOT NULL AND new.email_change_sent_at IS DISTINCT FROM old.email_change_sent_at THEN
      PERFORM private.log_activity(new.id, 'student', 'auth.email_change_requested', 'user', uid, '{}'::jsonb, NULL);
    END IF;
    IF new.email IS DISTINCT FROM old.email THEN
      PERFORM private.log_activity(new.id, 'student', 'auth.email_changed', 'user', uid, '{}'::jsonb, NULL);
    END IF;
    IF new.banned_until IS DISTINCT FROM old.banned_until THEN
      PERFORM private.log_activity(NULL, 'system', CASE WHEN new.banned_until > now() THEN 'auth.banned' ELSE 'auth.unbanned' END, 'user', uid, '{}'::jsonb, NULL);
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'activity_log (auth.users): %', sqlerrm;
  END;
  RETURN NULL;
END;
$$;--> statement-breakpoint

-- Sessions: a new session is a log in (with IP and browser), a removed one is a log out
CREATE OR REPLACE FUNCTION private.log_auth_session_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    IF tg_op = 'INSERT' THEN
      PERFORM private.log_activity(new.user_id, 'student', 'auth.login', 'session', new.id::text,
        jsonb_build_object('aal', new.aal::text, 'user_agent', new.user_agent), host(new.ip));
    ELSIF tg_op = 'DELETE' THEN
      PERFORM private.log_activity(old.user_id, 'student', 'auth.logout', 'session', old.id::text, '{}'::jsonb, NULL);
    ELSIF new.aal::text = 'aal2' AND old.aal::text IS DISTINCT FROM 'aal2' THEN
      PERFORM private.log_activity(new.user_id, 'student', 'auth.two_step_verified', 'session', new.id::text, '{}'::jsonb, host(new.ip));
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'activity_log (auth.sessions): %', sqlerrm;
  END;
  RETURN NULL;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS on_auth_user_activity ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_activity
  AFTER INSERT OR UPDATE OF email_confirmed_at, recovery_sent_at, encrypted_password, email_change_sent_at, email, banned_until ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.log_auth_user_activity();--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION private.log_auth_user_activity();--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_session_started ON auth.sessions;--> statement-breakpoint
CREATE TRIGGER on_auth_session_started
  AFTER INSERT OR UPDATE OF aal ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION private.log_auth_session_activity();--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_session_ended ON auth.sessions;--> statement-breakpoint
CREATE TRIGGER on_auth_session_ended
  AFTER DELETE ON auth.sessions
  FOR EACH ROW EXECUTE FUNCTION private.log_auth_session_activity();--> statement-breakpoint

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC, anon, authenticated;
