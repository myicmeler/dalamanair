import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL = Deno.env.get('APP_URL') ?? 'https://dalaman.me'

// Plivo credentials — set these as Edge Function secrets before deploying:
//   PLIVO_AUTH_ID, PLIVO_AUTH_TOKEN, PLIVO_SENDER
// PLIVO_SENDER is the "src": a UK alphanumeric sender ID (letters/numbers only,
// max 11 chars, e.g. "dalamanme") for one-way notifications, or a Plivo number
// in E.164. If auth id/token are missing the function safely no-ops so it can
// be deployed before the account is live.
const PLIVO_AUTH_ID    = Deno.env.get('PLIVO_AUTH_ID')    ?? ''
const PLIVO_AUTH_TOKEN = Deno.env.get('PLIVO_AUTH_TOKEN') ?? ''
const PLIVO_SENDER     = Deno.env.get('PLIVO_SENDER')     ?? 'dalamanme'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// Plivo wants E.164 digits with no '+' or separators.
function normaliseNumber(raw: string): string {
  return (raw ?? '').replace(/[^0-9]/g, '')
}

// Keep messages in the GSM-7 alphabet (160 chars/segment). Avoid arrows/emoji —
// a single non-GSM char forces UCS-2 (70 chars/segment) and doubles the cost.
function getMessage(type: string, data: any): string {
  const route = data?.route ?? 'your transfer'
  switch (type) {
    case 'driver_assigned':
      return `dalaman.me: Your driver for ${route} on ${data.date}${data.time ? ' ' + data.time : ''} is ${data.driverName}.`
        + `${data.driverPhone ? ` Tel ${data.driverPhone}.` : ''} Pay the driver directly on the day.`
    case 'provider_confirmed_acknowledge':
      return `dalaman.me: ${data.providerName ?? 'Your provider'} confirmed ${route} on ${data.date}.`
        + ` Please log in to acknowledge: ${APP_URL}/bookings/`
    case 'booking_fully_confirmed':
      return `dalaman.me: Your transfer ${route} on ${data.date}${data.time ? ' ' + data.time : ''} is confirmed. Safe travels!`
    case 'offers_waiting_reminder':
      return `dalaman.me: You have transfer offers waiting for ${route}. Compare and accept: ${APP_URL}/quotes/`
    default:
      return data?.text ?? 'dalaman.me notification'
  }
}

async function sendPlivo(dst: string, text: string): Promise<{ ok: boolean, detail?: string }> {
  const url = `https://api.plivo.com/v1/Account/${PLIVO_AUTH_ID}/Message/`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${PLIVO_AUTH_ID}:${PLIVO_AUTH_TOKEN}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ src: PLIVO_SENDER, dst, text }),
    })
    if (res.status === 202 || res.ok) return { ok: true }
    return { ok: false, detail: await res.text() }
  } catch (e: any) {
    return { ok: false, detail: e.message }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_KEY)

    // --- AUTHORIZATION (mirrors send-email) ---
    // Must not be callable anonymously. Privileged callers (service-role key or
    // a signed-in admin) may send to an arbitrary `to`; every other
    // authenticated caller may only send to a recipient we resolve from a
    // booking/customer/provider id, so it can't be used as an SMS relay.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    let isPrivileged = token === SERVICE_KEY
    if (!isPrivileged) {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return json({ error: 'Unauthorized' }, 401)
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      isPrivileged = profile?.role === 'admin'
    }
    // --- end authorization ---

    // Safe no-op until the Plivo account is configured, so this can be deployed early.
    if (!PLIVO_AUTH_ID || !PLIVO_AUTH_TOKEN) {
      return json({ sent: false, skipped: 'sms_not_configured' })
    }

    const { type, to, bookingId, customerId, providerUserId, data } = await req.json()
    if (!type) return json({ error: 'type required' }, 400)

    // A non-empty free-form `to` is only honoured for privileged callers.
    if (to && !isPrivileged) return json({ error: 'Not authorized to send to an arbitrary number' }, 403)

    let recipient = isPrivileged ? (to ?? '') : ''

    // Resolve from a booking (prefers the manual customer's phone for logged trips).
    if (!recipient && bookingId) {
      const { data: b } = await supabase.from('bookings')
        .select('source, customer_phone, manual_customer_phone, customer_id')
        .eq('id', bookingId).single()
      if (b) {
        recipient = (b.source === 'manual' ? (b.manual_customer_phone || b.customer_phone) : (b.customer_phone || '')) || ''
        if (!recipient && b.customer_id) {
          const { data: u } = await supabase.from('users').select('phone').eq('id', b.customer_id).single()
          if (u?.phone) recipient = u.phone
        }
      }
    }

    // Or from a user id.
    if (!recipient && (customerId || providerUserId)) {
      const { data: u } = await supabase.from('users').select('phone').eq('id', customerId || providerUserId).single()
      if (u?.phone) recipient = u.phone
    }

    const dst = normaliseNumber(recipient)
    if (!dst || dst.length < 8) return json({ error: 'recipient phone could not be resolved' }, 400)

    const text = getMessage(type, data ?? {})
    const result = await sendPlivo(dst, text)
    if (!result.ok) {
      console.error('Plivo send failed:', result.detail)
      return json({ sent: false, error: result.detail }, 502)
    }
    return json({ sent: true, to: dst })
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
