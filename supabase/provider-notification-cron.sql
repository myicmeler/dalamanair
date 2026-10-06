-- Prerequisites: enable pg_cron and pg_net in Supabase, then store secrets
-- named provider_notification_worker_url and secret_key in Vault (see README).
-- No credentials belong in this file or the repository.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'provider_notification_worker_url' AND NULLIF(decrypted_secret, '') IS NOT NULL)
    OR NOT EXISTS (SELECT 1 FROM vault.decrypted_secrets
    WHERE name = 'secret_key' AND NULLIF(decrypted_secret, '') IS NOT NULL) THEN
    RAISE EXCEPTION 'Configure provider_notification_worker_url and secret_key in Vault first';
  END IF;
END;
$$;
SELECT cron.schedule('provider-notification-worker', '* * * * *', $cron$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'provider_notification_worker_url' LIMIT 1),
    headers := jsonb_build_object('Content-Type', 'application/json',
      'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'secret_key' LIMIT 1)),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  );
$cron$);
