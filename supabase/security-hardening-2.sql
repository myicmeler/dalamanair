-- =============================================================
-- SECURITY HARDENING MIGRATION #2
-- Run once in the Supabase SQL editor. Every statement is
-- idempotent and safe to re-run.
--
-- Context: this app talks to Supabase directly from the browser
-- using the public anon key, so Row Level Security (RLS) is the
-- ONLY thing protecting the data. RLS is enabled on every table
-- (see security-hardening.sql), but three gaps remained where a
-- policy's USING clause had no column-level guard, letting a
-- legitimately-scoped user tamper with fields they shouldn't, or
-- read data meant to be hidden. This migration closes them.
-- =============================================================


-- -------------------------------------------------------------
-- 1. Prevent providers from self-approving / self-discounting.
--
-- The "Provider manages own record" policy on public.providers is
--   FOR UPDATE USING (user_id = auth.uid())
-- with no WITH CHECK column guard, so a provider can update their
-- OWN row's `is_approved` or `commission_pct` directly via the
-- anon client:
--     UPDATE providers SET is_approved = true, commission_pct = 0
--     WHERE user_id = auth.uid();
-- That bypasses admin approval and zeroes the platform commission.
-- This trigger blocks changes to those two columns unless the
-- caller is an admin or a trusted server-side / service-role
-- context (where there is no end-user JWT).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_provider_self_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- auth.uid() IS NULL -> server-side / service_role / SQL editor (trusted)
  -- is_admin()         -> platform administrator (trusted)
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.is_approved IS DISTINCT FROM OLD.is_approved THEN
    RAISE EXCEPTION 'Not authorized to change provider approval status';
  END IF;

  IF NEW.commission_pct IS DISTINCT FROM OLD.commission_pct THEN
    RAISE EXCEPTION 'Not authorized to change provider commission';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_provider_self_approval ON public.providers;
CREATE TRIGGER trg_prevent_provider_self_approval
  BEFORE UPDATE ON public.providers
  FOR EACH ROW EXECUTE FUNCTION public.prevent_provider_self_approval();


-- -------------------------------------------------------------
-- 2. Prevent providers / drivers from altering booking pricing.
--
-- The "Provider updates assigned bookings" and "Driver marks
-- booking complete" UPDATE policies on public.bookings are scoped
-- by provider_id / driver_id but place no restriction on WHICH
-- columns change, so an attached provider or driver could rewrite
-- `final_price` (or `price` / `discount_pct`) on a booking after
-- the customer accepted it. Monetary columns should only ever be
-- set by an admin or a trusted server-side context.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_booking_price_tamper()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.price       IS DISTINCT FROM OLD.price
     OR NEW.final_price IS DISTINCT FROM OLD.final_price
     OR NEW.discount_pct IS DISTINCT FROM OLD.discount_pct THEN
    RAISE EXCEPTION 'Not authorized to change booking pricing';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_booking_price_tamper ON public.bookings;
CREATE TRIGGER trg_prevent_booking_price_tamper
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.prevent_booking_price_tamper();


-- -------------------------------------------------------------
-- 3. Restore blind bidding on quote_offers.
--
-- The policy "Providers see offers on open requests" is
--   FOR SELECT USING (request_id IN
--       (SELECT id FROM quote_requests WHERE status = 'open'))
-- granted TO public. That lets ANY authenticated user — including
-- a competing provider — read EVERY offer (and its price) on any
-- open request, which defeats the blind-bidding model.
--
-- The app never relies on this: every provider-side read of
-- quote_offers is already filtered by `provider_id = <self>`
-- (covered by "Providers manage own offers"), and customers read
-- their own via "customers_see_own_offers". So this policy is pure
-- leak surface and is safe to drop.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Providers see offers on open requests" ON public.quote_offers;


-- -------------------------------------------------------------
-- 4. Keep the new trigger functions off the public RPC surface.
--    (EXECUTE is granted to PUBLIC by default; these are internal.)
-- -------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.prevent_provider_self_approval()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.prevent_provider_self_approval() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.prevent_booking_price_tamper()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.prevent_booking_price_tamper() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;


-- -------------------------------------------------------------
-- 5. Verification (optional — run and eyeball the output).
-- -------------------------------------------------------------
-- Expect the two triggers to exist:
-- SELECT tgname FROM pg_trigger
--   WHERE tgname IN ('trg_prevent_provider_self_approval',
--                    'trg_prevent_booking_price_tamper');
-- Expect the leak policy to be gone (0 rows):
-- SELECT policyname FROM pg_policies
--   WHERE tablename = 'quote_offers'
--     AND policyname = 'Providers see offers on open requests';
