# send-sms (Plivo) — activation

Customer SMS notifications via Plivo. Written but **dormant** — nothing sends
until you complete the steps below. Mirrors `send-email` (same auth model).

## What it sends
Called from `app/provider/bookings/page.tsx`:
- `driver_assigned` — when a provider assigns a driver (driver name + phone).
- `provider_confirmed_acknowledge` — when a provider confirms (prompts the customer to acknowledge).

Both are best-effort and gated by `NEXT_PUBLIC_SMS_ENABLED`, so they no-op until turned on.

## Activate (after signing up with Plivo)
1. **Get credentials** from the Plivo console: Auth ID and Auth Token.
2. **Sender ID**: for the UK use a free alphanumeric sender ID — letters/numbers
   only, max 11 chars (e.g. `dalamanme`). One-way (customers can't reply), which
   is fine for notifications. Some EU countries require sender-ID registration.
3. **Set Edge Function secrets** (Supabase → Edge Functions → Secrets):
   - `PLIVO_AUTH_ID`
   - `PLIVO_AUTH_TOKEN`
   - `PLIVO_SENDER` (e.g. `dalamanme`)
   - (`APP_URL` and `SUPABASE_*` already exist for the other functions.)
4. **Deploy** the function:
   `supabase functions deploy send-sms --project-ref pjmzcfketlbmexrpgset`
   (keep `verify_jwt` on, like the other functions.)
5. **Enable the client calls**: set `NEXT_PUBLIC_SMS_ENABLED=true` in Netlify env
   and redeploy the site.

Until step 3 is done the function returns `{ sent:false, skipped:'sms_not_configured' }`,
so deploying it early is harmless.

## Cost notes
- Messages are kept in the GSM-7 alphabet (no arrows/emoji) to stay 1 segment
  (160 chars). A single non-GSM char forces UCS-2 (70 chars/segment) and doubles cost.
- UK ~£0.03–0.04 per SMS. You pay the destination (home-network) rate, so a UK
  customer roaming in Turkey is still billed as a UK SMS.
- SMS only fires on high-value moments (driver assigned, provider confirmed) —
  never in loops.

## Recipient resolution
Given `bookingId`, the function uses the booking's `manual_customer_phone`
(for logged/manual trips) or `customer_phone`, falling back to the customer's
account phone. A free-form `to` is only honoured for admin/service-role callers.
