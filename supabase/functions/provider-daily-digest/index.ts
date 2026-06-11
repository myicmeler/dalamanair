import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL        = Deno.env.get('APP_URL')         ?? 'https://dalaman.me'
const MAILGUN_KEY    = Deno.env.get('MAILGUN_API_KEY')  ?? ''
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN')   ?? 'mg.dalaman.me'
const MAILGUN_FROM   = Deno.env.get('MAILGUN_FROM')     ?? 'dalaman.me <post@dalaman.me>'

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const url = `https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`
  const form = new FormData()
  form.append('from', MAILGUN_FROM)
  form.append('to', to)
  form.append('subject', subject)
  form.append('html', html)
  form.append('o:tag', 'provider-daily-digest')
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${btoa('api:' + MAILGUN_KEY)}` },
      body: form,
    })
    if (res.ok) { console.log(`Digest sent to ${to}`); return true }
    const err = await res.text()
    console.error(`Failed to send to ${to}:`, err)
    return false
  } catch (e) {
    console.error(`Exception sending to ${to}:`, e)
    return false
  }
}

function wrap(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0f1419;font-family:Arial,Helvetica,sans-serif"><div style="background:#0f1419;padding:32px 16px"><div style="max-width:560px;margin:0 auto"><div style="padding:24px 0;text-align:center;border-bottom:1px solid #333333;margin-bottom:20px"><span style="font-size:12px;font-weight:700;letter-spacing:0.22em;color:#ffffff">DALAMAN.ME</span></div>${content}<div style="text-align:center;padding:16px"><p style="font-size:11px;color:#888888;margin:0">dalaman.me · <a href="${APP_URL}" style="color:#888888;text-decoration:none">${APP_URL}</a></p></div><p style="font-size:11px;color:#ff0000;line-height:1.6;margin:16px 0 0;text-align:center">dalaman.me is an independent platform that connects travellers with local transfer providers. All bookings, agreements, and payments are made directly between the customer and the transfer company. dalaman.me accepts no financial liability and cannot guarantee the fulfilment of any transfer.</p></div></div></body></html>`
}

function section(title: string, color: string, items: string[]) {
  return `
    <div style="margin-bottom:20px">
      <p style="font-size:10px;letter-spacing:0.15em;text-transform:uppercase;color:${color};margin:0 0 10px">${title}</p>
      <div style="background:#1a1f26;border:1px solid rgba(255,255,255,0.08);border-radius:8px;overflow:hidden">
        ${items.map((item, i) => `
          <div style="padding:12px 16px;${i < items.length - 1 ? 'border-bottom:1px solid rgba(255,255,255,0.06)' : ''}">
            <p style="font-size:13px;color:#ffffff;margin:0;line-height:1.5">${item}</p>
          </div>
        `).join('')}
      </div>
    </div>`
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#f4b942;color:#0f1419;padding:13px 26px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none;margin-top:8px">${text}</a>`
}

function formatDate(dt: string) {
  return new Date(dt).toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })
}

function formatTime(dt: string) {
  return new Date(dt).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_KEY)

    // --- AUTHORIZATION ---
    // The digest emails every approved provider, so it must only be triggered
    // by the scheduled cron (service-role key) or an admin. The public anon key
    // satisfies verify_jwt but is not allowed here.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (token !== SERVICE_KEY) {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const { data: caller } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (!caller || caller.role !== 'admin') {
        return new Response(JSON.stringify({ error: 'Forbidden — admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }
    // --- end authorization ---

    // Get all approved providers with their email
    const { data: providers } = await supabase
      .from('providers')
      .select('id, company_name, user_id, user:users!user_id(email)')
      .eq('is_approved', true)

    if (!providers?.length) {
      return new Response(JSON.stringify({ sent: 0, skipped: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const now = new Date().toISOString()
    const in7days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    let sent = 0
    let skipped = 0

    for (const provider of providers) {
      const email = (provider.user as any)?.email
      if (!email) { skipped++; continue }

      // 1. Open requests this provider hasn't responded to
      const { data: declinedRefs } = await supabase
        .from('quote_declines')
        .select('request_id')
        .eq('provider_id', provider.id)
      const declinedIds = (declinedRefs ?? []).map((d: any) => d.request_id)

      const { data: myOfferRefs } = await supabase
        .from('quote_offers')
        .select('request_id')
        .eq('provider_id', provider.id)
      const offeredIds = (myOfferRefs ?? []).map((o: any) => o.request_id)

      const { data: openRequests } = await supabase
        .from('quote_requests')
        .select('id, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), pickup_time, passengers, trip_type')
        .eq('status', 'open')
        .gt('expires_at', now)
        .order('pickup_time', { ascending: true })

      const unanswered = (openRequests ?? []).filter((r: any) =>
        !declinedIds.includes(r.id) && !offeredIds.includes(r.id)
      )

      // 2. Pending offers this provider submitted (awaiting customer response)
      const { data: pendingOffers } = await supabase
        .from('quote_offers')
        .select('id, price, request:quote_requests!request_id(pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), pickup_time, currency)')
        .eq('provider_id', provider.id)
        .eq('status', 'pending')

      // 3. Upcoming confirmed bookings in next 7 days
      const { data: upcomingBookings } = await supabase
        .from('bookings')
        .select('id, pickup_time, status, pickup_location_id, dropoff_location_id, passengers, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
        .eq('provider_id', provider.id)
        .in('status', ['confirmed', 'driver_assigned'])
        .gt('pickup_time', now)
        .lt('pickup_time', in7days)
        .order('pickup_time', { ascending: true })

      // Skip if nothing to report
      if (!unanswered.length && !pendingOffers?.length && !upcomingBookings?.length) {
        skipped++
        continue
      }

      // Build email
      let content = `
        <div style="background:#1a1f26;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:32px;margin-bottom:20px">
          <p style="font-size:10px;letter-spacing:0.2em;color:#f4b942;text-transform:uppercase;margin:0 0 10px">Daily summary</p>
          <h1 style="font-size:22px;font-weight:500;color:#ffffff;margin:0 0 8px">Your dalaman.me update</h1>
          <p style="font-size:14px;color:rgba(255,255,255,0.5);margin:0 0 24px">${provider.company_name} · ${new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })}</p>
      `

      // Unanswered requests
      if (unanswered.length > 0) {
        const items = unanswered.map((r: any) =>
          `<strong>${(r.pickup as any)?.name} → ${(r.dropoff as any)?.name}</strong><br>
           <span style="font-size:12px;color:rgba(255,255,255,0.4)">${formatDate(r.pickup_time)} · ${formatTime(r.pickup_time)} · ${r.passengers} pax${r.trip_type === 'return' ? ' · Return' : ''}</span>`
        )
        content += section(`${unanswered.length} open request${unanswered.length > 1 ? 's' : ''} — no offer submitted yet`, '#f4b942', items)
      }

      // Pending offers
      if (pendingOffers?.length) {
        const items = pendingOffers.map((o: any) => {
          const sym = (o.request as any)?.currency === 'GBP' ? '£' : '€'
          return `<strong>${(o.request as any)?.pickup?.name} → ${(o.request as any)?.dropoff?.name}</strong> · <strong style="color:#f4b942">${sym}${o.price?.toFixed(2)}</strong><br>
                  <span style="font-size:12px;color:rgba(255,255,255,0.4)">${formatDate((o.request as any)?.pickup_time)} · Waiting for customer to accept</span>`
        })
        content += section(`${pendingOffers.length} offer${pendingOffers.length > 1 ? 's' : ''} awaiting customer response`, '#f4b942', items)
      }

      // Upcoming bookings
      if (upcomingBookings?.length) {
        const items = upcomingBookings.map((b: any) =>
          `<strong>${(b.pickup as any)?.name} → ${(b.dropoff as any)?.name}</strong><br>
           <span style="font-size:12px;color:rgba(255,255,255,0.4)">${formatDate(b.pickup_time)} · ${formatTime(b.pickup_time)} · ${b.passengers} pax · <span style="color:#1D9E75;text-transform:capitalize">${b.status.replace('_', ' ')}</span></span>`
        )
        content += section(`${upcomingBookings.length} upcoming booking${upcomingBookings.length > 1 ? 's' : ''} this week`, '#1D9E75', items)
      }

      content += `
          <div style="margin-top:20px">
            ${btn('Go to my dashboard →', `${APP_URL}/provider/`)}
          </div>
        </div>`

      const subject = [
        unanswered.length ? `${unanswered.length} open request${unanswered.length > 1 ? 's' : ''}` : '',
        pendingOffers?.length ? `${pendingOffers.length} pending offer${pendingOffers.length > 1 ? 's' : ''}` : '',
        upcomingBookings?.length ? `${upcomingBookings.length} upcoming booking${upcomingBookings.length > 1 ? 's' : ''}` : '',
      ].filter(Boolean).join(' · ') + ' — dalaman.me daily update'

      const ok = await sendEmail(email, subject, wrap(content))
      if (ok) sent++
      else skipped++
    }

    return new Response(JSON.stringify({ sent, skipped, total: providers.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (err: any) {
    console.error('Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
