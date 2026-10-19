-- The money ledger is append-only, like the activity log: a movement, once written, is never changed or removed, even by the
-- database owner. A mistake is put right with a new entry (an adjustment), so every balance and payout can be rebuilt.
CREATE OR REPLACE FUNCTION private.block_ledger_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'ledger_entries is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;--> statement-breakpoint

CREATE TRIGGER ledger_entries_no_update_delete BEFORE UPDATE OR DELETE ON public.ledger_entries FOR EACH ROW EXECUTE FUNCTION private.block_ledger_change();--> statement-breakpoint
CREATE TRIGGER ledger_entries_no_truncate BEFORE TRUNCATE ON public.ledger_entries FOR EACH STATEMENT EXECUTE FUNCTION private.block_ledger_change();--> statement-breakpoint

-- Functions are never callable through the Data API; the money tables are closed to it as well (RLS on, no policy).
REVOKE ALL ON FUNCTION private.block_ledger_change() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL ON public.ledger_entries, public.orders, public.refunds, public.disputes, public.payouts FROM anon, authenticated;
