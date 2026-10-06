-- Apply before deploying the updated frontend. New quotes and their provider
-- jobs commit together. Existing requests are deliberately not backfilled.
BEGIN;

CREATE TABLE IF NOT EXISTS public.provider_notification_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  generation integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer NOT NULL DEFAULT 0,
  available_at timestamptz NOT NULL DEFAULT now(),
  lease_token uuid,
  lease_until timestamptz,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, provider_id, generation)
);
CREATE INDEX IF NOT EXISTS provider_notification_jobs_due
  ON public.provider_notification_jobs (available_at)
  WHERE status IN ('pending', 'processing');
ALTER TABLE public.provider_notification_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.provider_notification_jobs FROM anon, authenticated;
GRANT ALL ON public.provider_notification_jobs TO service_role;

-- Service-only entrypoint used by the trigger and authorized Edge Function.
-- Generation 0 is idempotent. A deliberate admin reminder gets a new generation.
CREATE OR REPLACE FUNCTION public.enqueue_provider_notifications(
  p_request_id uuid, p_reminder boolean DEFAULT false
) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE v_generation integer := 0; v_count integer;
BEGIN
  PERFORM 1 FROM quote_requests WHERE id = p_request_id AND status = 'open' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Open request not found'; END IF;
  IF p_reminder THEN
    SELECT COALESCE(max(generation), 0) + 1 INTO v_generation
      FROM provider_notification_jobs WHERE request_id = p_request_id;
  END IF;
  INSERT INTO provider_notification_jobs (request_id, provider_id, generation)
    SELECT p_request_id, p.id, v_generation FROM providers p
    JOIN users u ON u.id = p.user_id
    WHERE p.is_approved = true AND NULLIF(trim(u.email), '') IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM quote_offers o
        WHERE o.request_id = p_request_id AND o.provider_id = p.id)
    ON CONFLICT (request_id, provider_id, generation) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_new_quote_provider_notifications()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF NEW.status = 'open' THEN
    PERFORM enqueue_provider_notifications(NEW.id, false);
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS queue_quote_provider_notifications ON public.quote_requests;
CREATE TRIGGER queue_quote_provider_notifications AFTER INSERT ON public.quote_requests
  FOR EACH ROW EXECUTE FUNCTION public.queue_new_quote_provider_notifications();

-- SKIP LOCKED plus a lease token prevents overlapping workers claiming a job.
-- Abandoned leases are retried; a job is attempted at most five times.
CREATE OR REPLACE FUNCTION public.claim_provider_notification_jobs(p_limit integer DEFAULT 5)
RETURNS SETOF public.provider_notification_jobs LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE provider_notification_jobs SET status = 'failed',
    last_error = 'Delivery worker exhausted its retry limit', lease_token = NULL, lease_until = NULL
    WHERE status = 'processing' AND lease_until < now() AND attempts >= 5;
  RETURN QUERY
    WITH due AS (
      SELECT id FROM provider_notification_jobs
      WHERE attempts < 5 AND (
        (status = 'pending' AND available_at <= now()) OR
        (status = 'processing' AND lease_until < now()))
      ORDER BY available_at, created_at
      LIMIT greatest(1, least(p_limit, 5)) FOR UPDATE SKIP LOCKED
    )
    UPDATE provider_notification_jobs j SET status = 'processing', attempts = attempts + 1,
      lease_token = gen_random_uuid(), lease_until = now() + interval '5 minutes'
    FROM due WHERE j.id = due.id RETURNING j.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_provider_notification_job(
  p_job_id uuid, p_lease_token uuid, p_outcome text, p_error text DEFAULT NULL
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
  IF p_outcome NOT IN ('sent', 'retry', 'skipped') THEN RAISE EXCEPTION 'Invalid outcome'; END IF;
  UPDATE provider_notification_jobs SET
    status = CASE WHEN p_outcome = 'retry' THEN
      CASE WHEN attempts >= 5 THEN 'failed' ELSE 'pending' END ELSE p_outcome END,
    available_at = now() + CASE attempts
      WHEN 1 THEN interval '1 minute' WHEN 2 THEN interval '5 minutes'
      WHEN 3 THEN interval '15 minutes' ELSE interval '1 hour' END,
    sent_at = CASE WHEN p_outcome = 'sent' THEN now() ELSE NULL END,
    last_error = left(p_error, 500), lease_token = NULL, lease_until = NULL
    WHERE id = p_job_id AND status = 'processing' AND lease_token = p_lease_token;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_provider_notifications(uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.queue_new_quote_provider_notifications() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_provider_notification_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_provider_notification_job(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_provider_notifications(uuid, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_provider_notification_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_provider_notification_job(uuid, uuid, text, text) TO service_role;
COMMIT;
