-- =============================================================
-- UNIQUE OFFER PER (request, provider)
-- Run once in the Supabase SQL editor. Idempotent.
--
-- Duplicate-offer protection was UI-only. generate_auto_offers already
-- guards each insert with NOT EXISTS (same request_id + provider_id), and
-- the provider UI blocks re-offers, but a race or double-submit could still
-- create a duplicate row. This unique index makes the invariant a hard
-- database guarantee (a duplicate insert now fails with 23505 instead of
-- silently creating a second offer).
-- =============================================================
CREATE UNIQUE INDEX IF NOT EXISTS quote_offers_request_provider_uniq
  ON public.quote_offers (request_id, provider_id);
