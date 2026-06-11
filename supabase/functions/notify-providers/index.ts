import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL        = Deno.env.get('APP_URL')        ?? 'https://dalaman.me'
const MAILGUN_KEY    = Deno.env.get('MAILGUN_API_KEY') ?? ''
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN')  ?? 'mg.dalaman.me'
const MAILGUN_FROM   = Deno.env.get('MAILGUN_FROM')    ?? 'dalaman.me <post@dalaman.me>'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const url = `https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`
  const form = new FormData()
  form.append('from', MAILGUN_FROM)
  form.append('to', to)
  form.append('subject', subject)
  form.append('html', html)
  form.append('o:tag', 'notify-providers')
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${btoa('api:' + MAILGUN_KEY)}` },
      body: form,
    })
    if (res.ok) { console.log(`Sent to ${to}`); return true }
    const err = await res.text()
    console.error(`Failed to send to ${to}:`, err)
    return false
  } catch (e) {
    console.error(`Exception sending to ${to}:`, e)
    return false
  }
}

function emailHtml(request: any) {
  const dt = new Date(request.pickup_time)
  const dateStr = dt.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
  const timeStr = dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
  const rows = [
    ['Route', `${request.pickup?.name} → ${request.dropoff?.name}`],
    ['Date', dateStr], ['Time', timeStr],
    ['Passengers', String(request.passengers)],
    ['Trip type', request.trip_type === 'return' ? 'Return' : 'One way'],
    ...(request.flight_number ? [['Flight', request.flight_number]] : []),
    ...(request.notes ? [['Notes', request.notes]] : []),
  ].map(([l,v]) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #2a2f36;font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;width:120px">${l}</td><td style="padding:10px 12px;border-bottom:1px solid #2a2f36;font-size:13px;color:#ffffff;font-weight:500">${v}</td></tr>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0f1419;font-family:Arial,Helvetica,sans-serif"><div style="background:#0f1419;padding:32px 16px"><div style="max-width:560px;margin:0 auto"><div style="padding:24px 0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px"><span style="font-size:12px;font-weight:700;letter-spacing:0.22em;color:#ffffff">DALAMAN.ME</span></div><div style="background:#1a1f26;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:32px;margin-bottom:20px"><p style="font-size:10px;letter-spacing:0.2em;color:#f4b942;text-transform:uppercase;margin:0 0 10px">New quote request</p><h1 style="font-size:22px;font-weight:500;color:#ffffff;margin:0 0 12px">A customer wants a transfer</h1><p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 20px">Submit your best price. This is blind bidding — you cannot see other providers' prices.</p><table style="width:100%;border-collapse:collapse;margin-bottom:20px">${rows}</table><div style="background:rgba(244,185,66,0.08);border:1px solid rgba(244,185,66,0.2);border-radius:6px;padding:12px 16px;margin-bottom:20px"><p style="font-size:12px;color:rgba(255,255,255,0.6);margin:0">This request expires in 48 hours.</p></div><a href="${APP_URL}/provider/quotes/" style="display:inline-block;background:#f4b942;color:#0f1419;padding:13px 26px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none">Submit your offer →</a></div><div style="text-align:center;padding:16px"><p style="font-size:11px;color:rgba(255,255,255,0.25);margin:0">dalaman.me · <a href="${APP_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none">${APP_URL}</a></p></div><p style="font-size:11px;color:#ff0000;line-height:1.6;margin:16px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif">dalaman.me is an independent platform that connects travellers with local transfer providers. All bookings, agreements, and payments are made directly between the customer and the transfer company. dalaman.me accepts no financial liability and cannot guarantee the fulfilment of any transfer. In the event of a dispute, customers should contact their transfer provider directly.</p></div></div></body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_KEY)

    // --- AUTHORIZATION ---
    // This function sends a provider email blast. Allow internal/cron callers
    // (service-role key) or any authenticated user; reject anonymous callers
    // so the public anon key can't be used to spam providers. verify_jwt alone
    // does not prove identity because the anon key is a valid project JWT.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (token !== SERVICE_KEY) {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }
    // --- end authorization ---

    const { requestId } = await req.json()
    if (!requestId) throw new Error('requestId is required')

    const { data: request } = await supabase.from('quote_requests')
      .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
      .eq('id', requestId).single()
    if (!request) throw new Error('Not found')

    // Get providers who already submitted an offer on this request
    const { data: existingOffers } = await supabase.from('quote_offers')
      .select('provider_id').eq('request_id', requestId)
    const alreadyOfferedIds = new Set((existingOffers ?? []).map((o: any) => o.provider_id))

    // Get all approved providers
    const { data: providers } = await supabase.from('providers')
      .select('id, company_name, user:users(email)').eq('is_approved', true)

    // Filter out providers who already submitted an offer
    const eligibleProviders = (providers ?? []).filter((p: any) => !alreadyOfferedIds.has(p.id))

    if (!eligibleProviders.length) return new Response(JSON.stringify({ sent: 0, total: 0, skipped: alreadyOfferedIds.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

    const dateStr = new Date(request.pickup_time).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    const subject = `New quote request: ${request.pickup?.name} → ${request.dropoff?.name} · ${dateStr}`
    const html = emailHtml(request)

    let sent = 0
    for (const provider of eligibleProviders) {
      const email = (provider.user as any)?.email
      if (!email) continue
      const ok = await sendEmail(email, subject, html)
      if (ok) sent++
    }

    return new Response(JSON.stringify({ sent, total: eligibleProviders.length, skipped: alreadyOfferedIds.size }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
