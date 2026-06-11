# Security — dalaman.me

_Last updated: 2026-06-11_

## Threat model (read this first)

This app talks to Supabase **directly from the browser** using the public
`anon` key. That key ships in the client bundle and is visible to anyone, so:

- **Row Level Security (RLS) and edge-function authorization are the only real
  security boundaries.** The client-side `role === 'admin'` checks in the
  admin/provider layouts are **UX only** — they protect nothing on their own.
- `verify_jwt = true` on an edge function is **not** an authorization check: the
  public anon key is a valid project JWT and satisfies it. Every privileged
  function must independently resolve the caller and check their role.

When in doubt, run the Supabase **security advisors** after any schema or policy
change (`get_advisors` / Dashboard → Advisors).

---

## Outstanding TODO

- [ ] **Store the service-role key in Vault** so the provider daily-digest cron
      can run. In Supabase → SQL Editor (keep the key out of chat/tickets):
      ```sql
      select vault.create_secret(
        'PASTE_YOUR_SERVICE_ROLE_KEY_HERE',
        'service_role_key',
        'Service role key used by pg_cron to call edge functions'
      );
      ```
      Verify with a manual run, then check the function logs for `200`:
      ```sql
      select net.http_post(
        url := 'https://pjmzcfketlbmexrpgset.supabase.co/functions/v1/smooth-responder',
        headers := jsonb_build_object('Content-Type','application/json',
          'Authorization','Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='service_role_key')),
        body := '{}'::jsonb
      );
      ```
- [ ] **Enable leaked-password protection** — Supabase → Authentication →
      Password settings (checks against HaveIBeenPwned).
- [ ] **Delete the stray `provider-daily-digest` edge function** in the
      dashboard. It was created by an accidental deploy to the wrong slug; the
      real digest lives under the `smooth-responder` slug. The stray one is
      unused and already gated, so it's harmless clutter.
- [ ] _(Optional)_ Rotate the service-role key and migrate to the newer
      publishable/secret key format if the old anon/service keys were ever
      pasted somewhere they shouldn't be.
- [ ] _(Optional)_ Restrict CORS on the email functions from `*` to the
      production origin(s).

---

## What was done (all applied to the live `transfer_dalaman` project)

### Database (`supabase/security-hardening.sql`)

| Fix | Detail |
|-----|--------|
| **RLS enabled on `public.users`** | Was disabled — anyone with the anon key could read all users' PII or `UPDATE users SET role='admin'`. Existing policies are now active. |
| **Role-escalation trigger** | `prevent_user_privilege_escalation` blocks non-admins from changing their own `role` on UPDATE. |
| **`search_path` pinned** | On all SECURITY DEFINER functions (`is_admin`, `current_role`, `my_provider_id`, `my_driver_id`, `set_booking_group`, `update_provider_rating`, `log_quote_status_change`) to prevent search-path injection. |
| **RPC execute revoked** | Internal trigger/maintenance functions revoked from `PUBLIC`, `anon`, `authenticated` so they can't be called as `/rest/v1/rpc/...`. |
| **Quote policy fixed** | The committed SQL (`run-all.sql`, `quotes-schema.sql`) no longer recreates the old `providers_see_open_requests USING (status='open')` policy, which leaked customer flight numbers/notes to anyone. Open requests are visible only to **approved** providers. |

### Edge functions

All run with the service-role key (bypassing RLS), so each now authorizes the
caller internally. Sources are vendored under `supabase/functions/`.

| Function (slug) | Gate | Live version |
|-----------------|------|--------------|
| `create-user` | Admin only | v32 |
| `get-email-logs` | Admin only | v2 |
| `register-provider` | Verifies target auth account + email; refuses to clobber elevated roles (IDOR fix). Stays anon-callable because it runs mid-signup before a session exists. | v2 |
| `send-email` | Service key **or** any authenticated user | v36 |
| `notify-providers` | Service key **or** any authenticated user | v30 |
| `provider-daily-digest` (`smooth-responder`) | Service key **or** admin | v2 |
| `delete-test-data` | Admin only (already correct — unchanged) | v1 |

### Client

- **`lib/functions.ts` → `callFunction(path, body)`** attaches the signed-in
  user's access token. **All privileged edge-function calls must go through it**
  — never hardcode `NEXT_PUBLIC_SUPABASE_ANON_KEY` as the `Authorization`.
  - `create-user` callers: `app/admin/users`, `app/admin/providers`, `app/admin/import`
  - `get-email-logs` callers: `app/admin/email`, `app/admin/emails`
  - `send-email` / `notify-providers` callers: `app/bookings`, `app/quotes`,
    `app/quote`, `app/provider/bookings`, `app/admin/quotes`
- **`lib/supabase.ts` / `lib/supabase-client.ts`** fall back to placeholder
  credentials so prerendering doesn't crash when build-time env vars are absent.

### Cron

- `pg_cron` job #11 (`provider-daily-digest`, daily 15:00) was failing with 401
  because its `Authorization` header was the literal placeholder
  `Bearer YOUR_SERVICE_ROLE_KEY`. Rescheduled to read the real key from **Vault**
  (see TODO #1 to populate the secret).

### Build / repo

- Added `.gitignore` and committed `package-lock.json`.
- `tsconfig.json` excludes `supabase/functions` (Deno URL imports must not be
  type-checked by the Next.js build).

---

## Conventions for future work

- **New edge function?** Add the auth gate before any privileged work:
  resolve the bearer with `supabase.auth.getUser(token)` and check role; allow
  the service-role key for cron/internal callers. Reject the bare anon key.
- **New client call to a function?** Use `callFunction` from `lib/functions.ts`.
- **Schema / policy change?** Re-run the security advisors and update this doc.
- **Required Netlify env vars** (all deploy contexts — they're inlined at build
  time): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
