-- The site content history is append-only, like the activity log: nothing in it can be changed or removed afterwards, even by
-- the database owner. (The activity log's own function says "activity_log"; this one names its table.)
CREATE OR REPLACE FUNCTION private.block_content_history_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'site_content_versions is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint

CREATE TRIGGER site_content_versions_no_update_delete BEFORE UPDATE OR DELETE ON public.site_content_versions FOR EACH ROW EXECUTE FUNCTION private.block_content_history_change();--> statement-breakpoint
CREATE TRIGGER site_content_versions_no_truncate BEFORE TRUNCATE ON public.site_content_versions FOR EACH STATEMENT EXECUTE FUNCTION private.block_content_history_change();--> statement-breakpoint

-- Functions are never callable through the Data API; the table is closed to it as well (RLS on, no policy).
REVOKE ALL ON FUNCTION private.block_content_history_change() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL ON public.site_content_versions FROM anon, authenticated;
