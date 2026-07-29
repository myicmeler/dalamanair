-- =============================================================
-- SECURITY HARDENING MIGRATION #4
-- Run once in the Supabase SQL editor. Idempotent / safe to re-run.
-- =============================================================


-- -------------------------------------------------------------
-- 1. Close the offer price-tamper vector.
--
-- The policy "customers_update_own_request_offers" was
--   FOR UPDATE USING/ WITH CHECK (request_id IN
--     (SELECT id FROM quote_requests WHERE customer_id = auth.uid()))
-- with NO column guard, so a customer could UPDATE *any* column —
-- including `price` — on any offer attached to their own request,
-- e.g. lower an offer's price via a direct PostgREST call before
-- accepting it.
--
-- The accept flow now runs entirely through the SECURITY DEFINER
-- accept_quote_offer() function, and the client makes no direct
-- quote_offers writes at all (verified: zero call sites). Customers
-- still read their offers via "customers_see_own_offers". So this
-- UPDATE policy is unnecessary and is pure attack surface — drop it.
-- -------------------------------------------------------------
DROP POLICY IF EXISTS customers_update_own_request_offers ON public.quote_offers;


-- -------------------------------------------------------------
-- 2. Give provider_cancelled_requests an INSERT policy.
--
-- The table had only a SELECT policy, so any INSERT silently
-- no-opped under RLS (the same silent-failure class as other
-- fixes). Allow a provider to log a cancellation row for their
-- own provider_id. (The current client records provider declines
-- in quote_declines, so this is defensive groundwork for any code
-- that writes here rather than a fix for an active path.)
-- -------------------------------------------------------------
DROP POLICY IF EXISTS "Providers insert own cancelled request refs" ON public.provider_cancelled_requests;
CREATE POLICY "Providers insert own cancelled request refs"
  ON public.provider_cancelled_requests
  FOR INSERT TO public
  WITH CHECK (provider_id = public.my_provider_id());
