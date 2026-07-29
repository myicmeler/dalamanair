-- =============================================================
-- ATOMIC BOOKING / QUOTE MUTATIONS
-- Run once in the Supabase SQL editor. Idempotent (CREATE OR REPLACE).
--
-- Problem: the customer accept-offer / cancel-request / acknowledge /
-- cancel-booking flows were performed as a *sequence* of separate
-- writes from the browser (update offers, update request, insert
-- booking(s), insert history, insert notifications). If any step
-- failed mid-way the database was left inconsistent (e.g. request
-- marked accepted but no booking created), and every error was
-- swallowed with console.error so the user saw nothing.
--
-- Fix: each flow becomes ONE SECURITY DEFINER function that does all
-- its DB writes in a single transaction — they now all-succeed or
-- all-roll-back. The client calls these via supabase.rpc() and shows
-- an error on failure. Email sending stays in the client (best-effort,
-- outside the DB transaction — Mailgun can't be transactional).
--
-- SECURITY: these run as the definer (RLS bypassed), so each one
-- re-checks auth.uid() ownership and the current status before
-- writing. They are granted to `authenticated` only. The Supabase
-- advisor will flag them (0029) as it does any authz-checked RPC;
-- that is expected — the authorization lives in the function body.
-- =============================================================


-- -------------------------------------------------------------
-- accept_quote_offer(offer) — accept one offer, reject the rest,
-- mark the request accepted, create the outbound (and, for return
-- trips, inbound) booking + initial history + in-app notifications.
-- Returns the new outbound booking id.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.accept_quote_offer(p_offer_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_offer      quote_offers%ROWTYPE;
  v_req        quote_requests%ROWTYPE;
  v_route      text;
  v_booking_id uuid;
  v_return_id  uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  -- Lock the offer and its request so two concurrent accepts can't race.
  SELECT * INTO v_offer FROM quote_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Offer not found'; END IF;

  SELECT * INTO v_req FROM quote_requests WHERE id = v_offer.request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote request not found'; END IF;

  IF v_req.customer_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not authorized to accept this offer';
  END IF;
  IF v_req.status <> 'open' THEN
    RAISE EXCEPTION 'This request is no longer open';
  END IF;
  IF v_offer.status <> 'pending' THEN
    RAISE EXCEPTION 'This offer is no longer available';
  END IF;

  SELECT (pl.name || ' -> ' || dl.name) INTO v_route
  FROM locations pl, locations dl
  WHERE pl.id = v_req.pickup_location_id AND dl.id = v_req.dropoff_location_id;

  UPDATE quote_offers SET status = 'accepted' WHERE id = p_offer_id;
  UPDATE quote_offers SET status = 'rejected'
    WHERE request_id = v_req.id AND id <> p_offer_id AND status = 'pending';
  UPDATE quote_requests SET status = 'accepted' WHERE id = v_req.id;

  -- Outbound booking (holds the full round-trip price for return trips).
  INSERT INTO bookings (
    customer_id, provider_id, vehicle_id, pickup_location_id, dropoff_location_id,
    direction, pickup_time, passengers, luggage, status, price, discount_pct,
    final_price, currency, request_id, flight_number, customer_notes
  ) VALUES (
    v_req.customer_id, v_offer.provider_id, v_offer.vehicle_id,
    v_req.pickup_location_id, v_req.dropoff_location_id,
    'outbound', v_req.pickup_time, v_req.passengers, v_req.luggage,
    'pending_provider_confirmation', v_offer.price, 0, v_offer.price,
    COALESCE(v_req.currency, 'EUR'), v_req.id, v_req.flight_number, v_req.notes
  ) RETURNING id INTO v_booking_id;

  -- INSERT does not fire the status-change trigger, so seed history here.
  INSERT INTO booking_status_history (booking_id, status, changed_by, changed_by_role, note)
  VALUES (v_booking_id, 'pending_provider_confirmation', v_uid, 'customer',
          'Customer accepted offer - awaiting provider confirmation');

  -- Return leg (direction 'inbound'; price 0 — covered by the outbound row).
  -- Share the outbound booking's group_id so both legs are linked as one group
  -- (set_booking_group only fills group_id when null, so an explicit value wins).
  IF v_req.trip_type = 'return' AND v_req.return_time IS NOT NULL THEN
    INSERT INTO bookings (
      group_id, customer_id, provider_id, vehicle_id, pickup_location_id, dropoff_location_id,
      direction, pickup_time, passengers, luggage, status, price, discount_pct,
      final_price, currency, request_id, flight_number, customer_notes
    ) VALUES (
      v_booking_id, v_req.customer_id, v_offer.provider_id, v_offer.vehicle_id,
      v_req.return_pickup_location_id, v_req.return_dropoff_location_id,
      'inbound', v_req.return_time,
      COALESCE(v_req.return_passengers, v_req.passengers),
      COALESCE(v_req.return_luggage, v_req.luggage),
      'pending_provider_confirmation', 0, 0, 0,
      COALESCE(v_req.currency, 'EUR'), v_req.id, v_req.return_flight_number, v_req.return_notes
    ) RETURNING id INTO v_return_id;

    INSERT INTO booking_status_history (booking_id, status, changed_by, changed_by_role, note)
    VALUES (v_return_id, 'pending_provider_confirmation', v_uid, 'customer',
            'Return leg - price included in outbound (round-trip offer)');
  END IF;

  -- In-app notifications: rejected providers, accepted provider, customer.
  INSERT INTO user_notifications (user_id, type, title, body, link)
  SELECT p.user_id, 'offer_not_selected', 'Your offer was not selected',
         'The customer chose another provider for ' || COALESCE(v_route, 'a transfer') || '.',
         '/provider/quotes/'
  FROM quote_offers qo JOIN providers p ON p.id = qo.provider_id
  WHERE qo.request_id = v_req.id AND qo.id <> p_offer_id AND p.user_id IS NOT NULL;

  INSERT INTO user_notifications (user_id, type, title, body, link)
  SELECT p.user_id, 'booking_pending_confirmation', 'Offer accepted - please confirm',
         'A customer accepted your offer for ' || COALESCE(v_route, 'a transfer') || '. Confirm to proceed.',
         '/provider/bookings/'
  FROM providers p WHERE p.id = v_offer.provider_id AND p.user_id IS NOT NULL;

  INSERT INTO user_notifications (user_id, type, title, body, link)
  VALUES (v_uid, 'booking_awaiting_provider', 'Offer accepted - waiting for provider',
          'The provider will confirm shortly. You will be notified.', '/bookings/');

  RETURN v_booking_id;
END;
$$;


-- -------------------------------------------------------------
-- cancel_quote_request(request) — if offers exist, mark cancelled
-- and notify each offering provider; if none, delete the request
-- (and any dependent decline/history rows). Returns 'cancelled'
-- or 'deleted'.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_quote_request(p_request_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_req        quote_requests%ROWTYPE;
  v_has_offers boolean;
  v_route      text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_req FROM quote_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote request not found'; END IF;
  IF v_req.customer_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not authorized to cancel this request';
  END IF;
  IF v_req.status <> 'open' THEN
    RAISE EXCEPTION 'Only open requests can be cancelled';
  END IF;

  SELECT EXISTS (SELECT 1 FROM quote_offers WHERE request_id = p_request_id) INTO v_has_offers;

  IF v_has_offers THEN
    UPDATE quote_requests SET status = 'cancelled' WHERE id = p_request_id;

    SELECT (pl.name || ' -> ' || dl.name) INTO v_route
    FROM locations pl, locations dl
    WHERE pl.id = v_req.pickup_location_id AND dl.id = v_req.dropoff_location_id;

    INSERT INTO user_notifications (user_id, type, title, body, link)
    SELECT p.user_id, 'request_cancelled', 'Quote request cancelled',
           'The customer cancelled the request for ' || COALESCE(v_route, 'a transfer') || '.',
           '/provider/quotes/'
    FROM quote_offers qo JOIN providers p ON p.id = qo.provider_id
    WHERE qo.request_id = p_request_id AND p.user_id IS NOT NULL;

    RETURN 'cancelled';
  ELSE
    DELETE FROM quote_status_history WHERE quote_request_id = p_request_id;
    DELETE FROM quote_declines       WHERE request_id = p_request_id;
    DELETE FROM quote_requests       WHERE id = p_request_id;
    RETURN 'deleted';
  END IF;
END;
$$;


-- -------------------------------------------------------------
-- acknowledge_booking(booking) — customer confirms a provider-
-- confirmed booking. Status -> confirmed + provider notification.
-- (booking_status_history is written by the AFTER UPDATE trigger.)
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.acknowledge_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_b     bookings%ROWTYPE;
  v_route text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_b.customer_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_b.status <> 'pending_customer_acknowledgement' THEN
    RAISE EXCEPTION 'This booking is not awaiting your acknowledgement';
  END IF;

  UPDATE bookings SET status = 'confirmed' WHERE id = p_booking_id;

  IF v_b.provider_id IS NOT NULL THEN
    SELECT (pl.name || ' -> ' || dl.name) INTO v_route
    FROM locations pl, locations dl
    WHERE pl.id = v_b.pickup_location_id AND dl.id = v_b.dropoff_location_id;

    INSERT INTO user_notifications (user_id, type, title, body, link)
    SELECT p.user_id, 'booking_confirmed', 'Booking fully confirmed',
           'The customer acknowledged the booking for ' || COALESCE(v_route, 'a transfer') || '.',
           '/provider/bookings/'
    FROM providers p WHERE p.id = v_b.provider_id AND p.user_id IS NOT NULL;
  END IF;
END;
$$;


-- -------------------------------------------------------------
-- cancel_booking(booking) — customer cancels a booking that is
-- still cancellable. Status -> cancelled + provider notification.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_b     bookings%ROWTYPE;
  v_route text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT * INTO v_b FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Booking not found'; END IF;
  IF v_b.customer_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF v_b.status NOT IN ('pending_provider_confirmation',
                        'pending_customer_acknowledgement',
                        'confirmed') THEN
    RAISE EXCEPTION 'This booking can no longer be cancelled';
  END IF;

  UPDATE bookings SET status = 'cancelled' WHERE id = p_booking_id;

  IF v_b.provider_id IS NOT NULL THEN
    SELECT (pl.name || ' -> ' || dl.name) INTO v_route
    FROM locations pl, locations dl
    WHERE pl.id = v_b.pickup_location_id AND dl.id = v_b.dropoff_location_id;

    INSERT INTO user_notifications (user_id, type, title, body, link)
    SELECT p.user_id, 'booking_cancelled', 'Booking cancelled',
           'The customer cancelled the booking for ' || COALESCE(v_route, 'a transfer') || '.',
           '/provider/bookings/'
    FROM providers p WHERE p.id = v_b.provider_id AND p.user_id IS NOT NULL;
  END IF;
END;
$$;


-- -------------------------------------------------------------
-- Grants: callable by signed-in users only (they self-authorize
-- inside the body via auth.uid()). Keep them off the anon surface.
-- -------------------------------------------------------------
DO $$
DECLARE fn text;
BEGIN
  FOREACH fn IN ARRAY ARRAY[
    'public.accept_quote_offer(uuid)',
    'public.cancel_quote_request(uuid)',
    'public.acknowledge_booking(uuid)',
    'public.cancel_booking(uuid)'
  ] LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon;', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated;', fn);
  END LOOP;
END $$;
