-- =============================================================
-- ADMIN ATOMIC MUTATIONS
-- Run once in the Supabase SQL editor. Idempotent (CREATE OR REPLACE).
--
-- The admin Quote-requests screen performed two multi-step writes as
-- separate browser calls:
--   * delete a request -> five sequential DELETEs across child tables
--     then the request (a mid-way failure orphaned offers/history rows);
--   * edit an offer price -> UPDATE the offer then INSERT an audit row
--     (a failure left the price changed with no audit trail, and the
--     'admin' role on that audit row was self-asserted by the client).
--
-- Both now run inside one SECURITY DEFINER function that verifies the
-- caller really is an admin (is_admin()) and does all writes in a
-- single transaction. The audit row's changed_by_role is now written
-- server-side after a verified admin check, so it is trustworthy.
-- =============================================================


-- -------------------------------------------------------------
-- admin_delete_quote_requests(ids[]) — atomically remove the given
-- requests and all their dependent rows. Handles single + bulk.
-- Returns the number of quote_requests deleted.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_delete_quote_requests(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM quote_offers        WHERE request_id       = ANY(p_ids);
  DELETE FROM quote_declines      WHERE request_id       = ANY(p_ids);
  DELETE FROM quote_status_history WHERE quote_request_id = ANY(p_ids);
  DELETE FROM competition_entries WHERE quote_request_id = ANY(p_ids);
  DELETE FROM quote_requests      WHERE id               = ANY(p_ids);
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;


-- -------------------------------------------------------------
-- admin_update_offer_price(offer, new_price) — atomically update an
-- offer's price and write a verified-admin audit row. Returns the
-- previous price (so the caller can render the change / email).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_update_offer_price(p_offer_id uuid, p_new_price numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_offer   quote_offers%ROWTYPE;
  v_status  text;
  v_company text;
  v_old     numeric;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;
  IF p_new_price IS NULL OR p_new_price < 0 THEN
    RAISE EXCEPTION 'Invalid price';
  END IF;

  SELECT * INTO v_offer FROM quote_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;
  v_old := v_offer.price;

  SELECT status INTO v_status FROM quote_requests WHERE id = v_offer.request_id;
  SELECT company_name INTO v_company FROM providers WHERE id = v_offer.provider_id;

  UPDATE quote_offers SET price = p_new_price WHERE id = p_offer_id;

  INSERT INTO quote_status_history (quote_request_id, status, changed_by, changed_by_role, note)
  VALUES (
    v_offer.request_id, COALESCE(v_status, 'open'), v_uid, 'admin',
    'Offer price updated by admin: ' || to_char(v_old, 'FM999999990.00')
      || ' -> ' || to_char(p_new_price, 'FM999999990.00')
      || COALESCE(' (' || v_company || ')', '')
  );

  RETURN v_old;
END;
$$;


-- -------------------------------------------------------------
-- Grants: callable by signed-in users; each verifies is_admin()
-- inside. Keep them off the anon surface.
-- -------------------------------------------------------------
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.admin_delete_quote_requests(uuid[])',
    'public.admin_update_offer_price(uuid, numeric)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', fn);
  END LOOP;
END $$;
