-- =============================================================
-- SECURITY HARDENING MIGRATION #3
-- Clears the remaining Supabase security-advisor warnings.
-- Run once in the Supabase SQL editor. Idempotent / safe to re-run.
--
-- These are all defence-in-depth cleanups on internal functions —
-- none was an active exploit, but the advisor flags them and
-- there's no reason to leave them exposed.
-- =============================================================


-- -------------------------------------------------------------
-- 1. Pin search_path on the one function still missing it.
--    (lint 0011_function_search_path_mutable)
--    touch_bookings_updated_at is SECURITY INVOKER, but pinning
--    the path is free hygiene and silences the warning.
-- -------------------------------------------------------------
ALTER FUNCTION public.touch_bookings_updated_at() SET search_path = public, pg_temp;


-- -------------------------------------------------------------
-- 2. Remove internal functions from the public RPC surface.
--    (lints 0028 / 0029 — SECURITY DEFINER fns callable via
--    /rest/v1/rpc/... by anon or authenticated)
--
--    These are trigger / maintenance functions that are never
--    meant to be called directly by a client:
--      * set_booking_customer_phone  — BEFORE INSERT trigger fn
--      * log_booking_status_change   — AFTER UPDATE trigger fn
--      * touch_bookings_updated_at   — BEFORE UPDATE trigger fn
--      * generate_auto_offers        — invoked server-side only
--
--    Trigger functions run in the trigger's own (definer) context,
--    so the triggering user never needs EXECUTE — revoking it does
--    NOT stop the triggers from firing. generate_auto_offers keeps
--    its explicit service_role grant, so server-side callers are
--    unaffected; only the anon/authenticated RPC path is closed.
--    (Verified: the app makes no .rpc() calls, and no trigger or
--    function body invokes generate_auto_offers.)
-- -------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.set_booking_customer_phone()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.set_booking_customer_phone() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.log_booking_status_change()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.log_booking_status_change() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.touch_bookings_updated_at()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.touch_bookings_updated_at() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.generate_auto_offers(uuid)') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.generate_auto_offers(uuid) FROM PUBLIC, anon, authenticated;
    -- Belt-and-braces: guarantee the server-side caller keeps access.
    GRANT EXECUTE ON FUNCTION public.generate_auto_offers(uuid) TO service_role;
  END IF;
END $$;


-- -------------------------------------------------------------
-- 3. INTENTIONALLY LEFT EXECUTABLE (do NOT revoke).
--
--    is_admin(), current_role(), my_provider_id(), my_driver_id()
--    and can_notify(uuid) are referenced inside RLS policies, which
--    require the querying role (anon/authenticated) to hold EXECUTE.
--    They only ever reveal the *caller's own* role / ids (or a
--    boolean), so exposing them is safe. The advisor will keep
--    flagging these (0028/0029) — that is an accepted false positive.
--
--    Pin can_notify's search_path for consistency with the others.
-- -------------------------------------------------------------
ALTER FUNCTION public.can_notify(uuid) SET search_path = public, pg_temp;


-- -------------------------------------------------------------
-- 4. NOT fixable in SQL — Auth setting (do this in the dashboard):
--    "Leaked Password Protection Disabled" (auth_leaked_password_protection)
--    Enable at: Authentication → Sign In / Providers → Password protection
--    (checks new passwords against HaveIBeenPwned). One-click toggle.
-- -------------------------------------------------------------


-- -------------------------------------------------------------
-- 5. Verification (optional).
-- -------------------------------------------------------------
-- Expect no rows for the internal fns (anon/authenticated revoked):
-- SELECT routine_name, grantee FROM information_schema.role_routine_grants
--   WHERE routine_schema='public'
--     AND routine_name IN ('generate_auto_offers','set_booking_customer_phone',
--                          'log_booking_status_change','touch_bookings_updated_at')
--     AND grantee IN ('anon','authenticated','PUBLIC');
