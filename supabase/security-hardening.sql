-- =============================================================
-- SECURITY HARDENING MIGRATION
-- Run once in the Supabase SQL editor. Every statement is
-- idempotent and safe to re-run.
--
-- Context: this app talks to Supabase directly from the browser
-- using the public anon key. That key is visible to anyone, so
-- Row Level Security (RLS) is the ONLY thing protecting the data.
-- The client-side role checks in the admin/provider layouts are
-- UX only and provide NO security on their own.
-- =============================================================


-- -------------------------------------------------------------
-- 1. CRITICAL: enable RLS on public.users
--
-- This table holds every user's email, phone and role. RLS was
-- DISABLED, which meant anyone with the anon key could read all
-- users AND run `UPDATE users SET role='admin'` to take over the
-- platform. The policies below already existed but were dormant
-- because RLS was off — enabling it activates them.
-- -------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Safety net: re-create the expected policies only if they are
-- missing, so this file fully provisions a fresh database too.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users see own profile') THEN
    CREATE POLICY "Users see own profile" ON public.users
      FOR SELECT USING (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can insert own profile') THEN
    CREATE POLICY "Users can insert own profile" ON public.users
      FOR INSERT WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Users can update own profile') THEN
    CREATE POLICY "Users can update own profile" ON public.users
      FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='users' AND policyname='Admins full access to users') THEN
    CREATE POLICY "Admins full access to users" ON public.users
      FOR ALL USING (public.is_admin());
  END IF;
END $$;


-- -------------------------------------------------------------
-- 2. Prevent privilege escalation via self-update.
--
-- The "Users can update own profile" policy lets a user update
-- their own row (needed for name/phone), but RLS WITH CHECK can't
-- stop them from also setting role='admin' in that same update.
-- This trigger blocks any role change unless the caller is an
-- admin (or a trusted server-side / service-role context where
-- there is no end-user JWT).
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_user_privilege_escalation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- auth.uid() IS NULL  -> server-side / service_role / SQL editor (trusted)
  -- is_admin()          -> platform administrator (trusted)
  IF auth.uid() IS NULL OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Not authorized to change account role';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_user_privilege_escalation ON public.users;
CREATE TRIGGER trg_prevent_user_privilege_escalation
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.prevent_user_privilege_escalation();


-- -------------------------------------------------------------
-- 3. Harden SECURITY DEFINER helper functions.
--
-- SECURITY DEFINER functions run with the owner's privileges, so
-- a mutable search_path is a known privilege-escalation vector
-- (an attacker shadows a built-in by creating an object in a
-- schema earlier on the path). Pin the search_path on each one.
-- These are CREATE OR REPLACE with the existing bodies unchanged.
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND role = 'admin'::user_role
  );
$$;

CREATE OR REPLACE FUNCTION public."current_role"()
RETURNS user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.my_provider_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.providers WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.my_driver_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1;
$$;


-- Pin search_path on the remaining trigger functions too. We can't
-- CREATE OR REPLACE these without their bodies, but ALTER FUNCTION
-- attaches the setting without touching the body.
ALTER FUNCTION public.set_booking_group()       SET search_path = public, pg_temp;
ALTER FUNCTION public.update_provider_rating()  SET search_path = public, pg_temp;
ALTER FUNCTION public.log_quote_status_change() SET search_path = public, pg_temp;


-- -------------------------------------------------------------
-- 4. Stop internal trigger/maintenance functions from being
--    callable as public RPC endpoints (/rest/v1/rpc/...).
--    These are never meant to be invoked directly by clients.
--    EXECUTE is granted to PUBLIC by default, so revoke that too.
--
--    NOTE: is_admin/current_role/my_provider_id/my_driver_id are
--    intentionally left executable — they are referenced inside RLS
--    policies (which require the querying role to have EXECUTE) and
--    only ever reveal the *caller's own* role/ids, so exposing them
--    is safe.
-- -------------------------------------------------------------
DO $$
BEGIN
  IF to_regprocedure('public.handle_new_user()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.rls_auto_enable()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.prevent_user_privilege_escalation()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.prevent_user_privilege_escalation() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.set_booking_group()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.set_booking_group() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.update_provider_rating()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.update_provider_rating() FROM PUBLIC, anon, authenticated;
  END IF;
  IF to_regprocedure('public.log_quote_status_change()') IS NOT NULL THEN
    REVOKE EXECUTE ON FUNCTION public.log_quote_status_change() FROM PUBLIC, anon, authenticated;
  END IF;
END $$;


-- -------------------------------------------------------------
-- 5. Verification (optional — run and eyeball the output).
-- -------------------------------------------------------------
-- SELECT relrowsecurity AS users_rls_enabled FROM pg_class
--   WHERE oid = 'public.users'::regclass;        -- expect: true
-- SELECT has_table_privilege('anon','public.users','SELECT'); -- table grant; RLS still gates rows
