# Provider notification delivery

Quote insertion queues one job per approved provider in the same database
transaction. Closing the browser cannot interrupt queuing or delivery. The
worker claims up to five jobs per invocation and retries failed deliveries after
1, 5, 15 and 60 minutes. After five attempts a job stays `failed` for inspection.
Jobs for closed requests, providers who have already offered, or providers who
are no longer approved are skipped. An explicit admin push creates reminder
jobs; customer/API retries do not create another initial notification.

## Deployment order

1. Run `supabase/provider-notification-queue.sql` in the Supabase SQL editor.
   This must succeed before deploying the frontend; it adds a trigger and three
   service-only RPCs. It does not enqueue historical requests.
2. Deploy the worker and the updated notification/receipt functions:
   ```sh
   supabase functions deploy provider-notification-worker --project-ref YOUR_PROJECT_REF --no-verify-jwt
   supabase functions deploy notify-providers --project-ref YOUR_PROJECT_REF
   supabase functions deploy send-email --project-ref YOUR_PROJECT_REF
   ```
   The worker authenticates the server key itself; never expose it to the
   browser. It accepts the legacy service-role key or a current secret from
   `SUPABASE_SECRET_KEYS`. The existing Mailgun settings are reused:
   `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_FROM`, and optional `APP_URL`.
3. Enable `pg_cron` and `pg_net` in Supabase. In Vault, create a secret named
   `provider_notification_worker_url` with value
   `https://YOUR-PROJECT.supabase.co/functions/v1/provider-notification-worker`.
   Ensure Vault's existing `secret_key` contains a server key accepted by the
   worker. Set secrets through Supabase's UI; do not commit them.
4. Run `supabase/provider-notification-cron.sql`. It validates the Vault entries
   and schedules the worker every minute. Rerunning updates the named job.
5. Deploy the frontend. If sign-up uses email confirmation, add
   `https://dalaman.me/quote/**` to Supabase Auth's redirect URL allowlist so
   customers can return to the saved quote. Drafts are kept in the original tab's
   session storage for up to 24 hours; returning via its sign-in link restores
   them even if the confirmation link opened another tab.

## Check delivery

After submitting a test quote, inspect the queue in the SQL editor:

```sql
SELECT id, request_id, provider_id, status, attempts, available_at, sent_at, last_error
FROM public.provider_notification_jobs ORDER BY created_at DESC LIMIT 50;
```

`sent` means Mailgun accepted the email, not that the recipient opened it or
that it reached their inbox. Inspect Mailgun delivery events for bounces.
If an outage exhausts retries, fix the cause, then reset only the affected jobs:

```sql
UPDATE public.provider_notification_jobs
SET status = 'pending', attempts = 0, available_at = now(), last_error = NULL
WHERE status = 'failed' AND request_id = 'THE-AFFECTED-REQUEST-ID';
```

The queue uses leases to avoid ordinary overlapping sends. Delivery is at least
once: if Mailgun accepts an email but the worker crashes before recording the
result, lease recovery may send it again. Job IDs are attached to Mailgun events
as `notification_job_id` for diagnosis. Clients cannot read or mutate queue jobs.

For local regression tests, use Node.js 22.18+ and run `npm test`. Database tests
run the actual SQL against an isolated PostgreSQL engine (PGlite), without
production credentials or sending email. Production cron and Mailgun delivery
still require a deployment smoke test.

For the browser regression, install Chromium (or set `BROWSER_PATH` to your
existing Chromium executable), start a local development server with synthetic
Supabase settings, and run `npm run test:browser` in another terminal:

```sh
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 NEXT_PUBLIC_SUPABASE_ANON_KEY=synthetic-test-key npm run dev -- --hostname 127.0.0.1 --port 3000
```

The browser test intercepts all Supabase calls; no real backend or email is used.
It verifies sign-in and signup navigation, restoration, a failed submission and
retry with the same ID, and a successful request despite an email outage.
