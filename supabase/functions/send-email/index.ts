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
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${btoa('api:' + MAILGUN_KEY)}` },
      body: form,
    })
    if (res.ok) { console.log(`Sent to ${to}: ${subject}`); return true }
    const err = await res.text()
    console.error(`Failed:`, err)
    return false
  } catch (e) {
    console.error(`Exception:`, e)
    return false
  }
}

function wrap(content: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0f1419;font-family:Arial,Helvetica,sans-serif"><div style="background:#0f1419;padding:32px 16px"><div style="max-width:560px;margin:0 auto"><div style="padding:24px 0;text-align:center;border-bottom:1px solid #333333;margin-bottom:20px"><span style="font-size:12px;font-weight:700;letter-spacing:0.22em;color:#ffffff">DALAMAN.ME</span></div>${content}<div style="text-align:center;padding:16px"><p style="font-size:11px;color:#888888;margin:0">dalaman.me · <a href="${APP_URL}" style="color:#888888;text-decoration:none">${APP_URL}</a></p></div><p style="font-size:11px;color:#ff0000;line-height:1.6;margin:16px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif">dalaman.me is an independent platform that connects travellers with local transfer providers. All bookings, agreements, and payments are made directly between the customer and the transfer company. dalaman.me accepts no financial liability and cannot guarantee the fulfilment of any transfer. In the event of a dispute, customers should contact their transfer provider directly.</p></div></div></body></html>`
}

function rows(items: [string,string][]) {
  return `<table style="width:100%;border-collapse:collapse;margin:0 0 20px">${items.map(([l,v])=>`<tr><td style="padding:10px 12px;border-bottom:1px solid #2a2f36;font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;width:130px">${l}</td><td style="padding:10px 12px;border-bottom:1px solid #2a2f36;font-size:13px;color:#ffffff;font-weight:500">${v}</td></tr>`).join('')}</table>`
}

function card(tag: string, title: string, body: string) {
  return `<div style="background:#1a1f26;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:32px;margin-bottom:20px"><p style="font-size:10px;letter-spacing:0.2em;color:#f4b942;text-transform:uppercase;margin:0 0 10px">${tag}</p><h1 style="font-size:22px;font-weight:500;color:#ffffff;margin:0 0 16px">${title}</h1>${body}</div>`
}

function btn(text: string, href: string) {
  return `<a href="${href}" style="display:inline-block;background:#f4b942;color:#0f1419;padding:13px 26px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none">${text}</a>`
}

function urgentAlert(phone: string, email: string) {
  return `<div style="background:#7f1d1d;border:2px solid #ef4444;border-radius:6px;padding:16px;margin:16px 0"><p style="font-size:13px;font-weight:700;color:#fca5a5;margin:0 0 8px">⚠️ URGENT — Transfer date is less than 14 days away</p><p style="font-size:13px;color:#fca5a5;margin:0;line-height:1.6">Please contact the other party immediately by phone or WhatsApp to arrange an alternative.${phone ? `<br><strong>Phone/WhatsApp: ${phone}</strong>` : ''}${email ? `<br><strong>Email: ${email}</strong>` : ''}</p></div>`
}

function sym(currency: string) {
  return currency === 'GBP' ? '£' : '€'
}

function getTemplate(type: string, data: any): { subject: string, html: string } {
  switch (type) {
    case 'quote_submitted': return { subject:`Quote request received — ${data.pickup} → ${data.dropoff}`, html:wrap(card('Quote request',"We've sent your request to providers",`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">All approved providers have been notified.</p>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Time',data.time],['Passengers',`${data.passengers}`],['Trip type',data.tripType==='return'?'Return':'One way']])}${btn('View my quotes →',`${APP_URL}/quotes/`)}<p style="font-size:12px;color:rgba(255,255,255,0.3);margin:12px 0 0">Open for 48 hours. Prices hidden until providers respond.</p>`)) }

    case 'new_offer': return { subject:`New offer — ${data.pickup} → ${data.dropoff} · ${sym(data.currency ?? 'EUR')}${data.price}`, html:wrap(card('New offer','A provider sent you a price',`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px"><strong style="color:#fff">${data.providerName}</strong> submitted an offer.</p><div style="background:rgba(244,185,66,0.08);border:1px solid rgba(244,185,66,0.2);border-radius:6px;padding:16px;margin:0 0 16px;text-align:center"><p style="font-size:32px;font-weight:700;color:#f4b942;margin:0">${sym(data.currency ?? 'EUR')} ${data.price}</p></div>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date]])}${btn('View offers & accept →',`${APP_URL}/quotes/`)}`)) }

    case 'offer_accepted_provider': return { subject:`Offer accepted — please confirm — ${data.pickup} → ${data.dropoff}`, html:wrap(card('Offer accepted','Your offer was accepted 🎉 — please confirm',`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">The customer accepted your offer. Please review and confirm the booking.</p><div style="background:rgba(244,185,66,0.08);border:1px solid rgba(244,185,66,0.2);border-radius:6px;padding:16px;margin:0 0 16px;text-align:center"><p style="font-size:32px;font-weight:700;color:#f4b942;margin:0">${sym(data.currency ?? 'EUR')} ${data.price}</p></div>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Time',data.time],['Passengers',`${data.passengers}`],...(data.flightNumber?[['Flight',data.flightNumber] as [string,string]]:[]),...(data.notes?[['Notes',data.notes] as [string,string]]:[])])}${btn('Confirm booking →',`${APP_URL}/provider/bookings/`)}`)) }

    case 'provider_confirmed_acknowledge': return { subject:`Provider confirmed — please acknowledge — ${data.pickup} → ${data.dropoff}`, html:wrap(card('Provider confirmed','Action needed — acknowledge the booking',`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px"><strong style="color:#fff">${data.providerName}</strong> has confirmed your booking. Please log in to acknowledge and fully confirm.</p>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Time',data.time],['Provider',data.providerName],['Price',`${sym(data.currency ?? 'EUR')} ${data.price}`]])}${btn('Acknowledge booking →',`${APP_URL}/bookings/`)}<p style="font-size:12px;color:rgba(255,255,255,0.3);margin:12px 0 0">Pay your driver directly on transfer day.</p>`)) }

    case 'booking_fully_confirmed': return { subject:`Booking fully confirmed — ${data.pickup} → ${data.dropoff} · ${data.date}`, html:wrap(card('Confirmed','Booking is fully confirmed ✓',`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">The customer acknowledged your confirmation. The booking is now fully confirmed.</p>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Time',data.time],['Price',`${sym(data.currency ?? 'EUR')} ${data.price}`]])}${btn('View bookings →',`${APP_URL}/provider/bookings/`)}`)) }

    case 'offer_not_selected': return { subject:`Another offer was selected — ${data.pickup} → ${data.dropoff}`, html:wrap(card('Quote update','Another offer was selected',`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">The customer chose a different provider.</p>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Your price',`${sym(data.currency ?? 'EUR')} ${data.price}`]])}${btn('View open requests →',`${APP_URL}/provider/quotes/`)}`)) }

    case 'booking_cancelled_customer': return { subject:`Booking cancelled — ${data.pickup} → ${data.dropoff} · ${data.date}`, html:wrap(card('Booking cancelled','Your booking has been cancelled',`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">Your booking with <strong style="color:#fff">${data.providerName}</strong> has been cancelled.</p>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Time',data.time],['Price',`${sym(data.currency ?? 'EUR')} ${data.price}`]])}${data.urgent ? urgentAlert(data.providerPhone, data.providerEmail) : ''}`)) }

    case 'booking_cancelled_provider': return { subject:`Booking cancelled — ${data.pickup} → ${data.dropoff} · ${data.date}`, html:wrap(card('Booking cancelled','A customer has cancelled their booking',`<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">The customer has cancelled their booking.</p>${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Time',data.time],['Price',`${sym(data.currency ?? 'EUR')} ${data.price}`]])}${data.urgent ? urgentAlert(data.customerPhone, data.customerEmail) : ''}`)) }

    case 'offer_price_updated': return {
      subject: `Offer price updated — ${data.pickup} → ${data.dropoff}`,
      html: wrap(card(
        'Price update',
        'An offer price has been updated',
        `<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">
          Hi ${data.customerName}, the price from <strong style="color:#fff">${data.providerName}</strong> has been updated.
        </p>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:16px;margin:0 0 16px;display:flex;align-items:center;justify-content:center;gap:16px;text-align:center">
          <div>
            <p style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px">Old price</p>
            <p style="font-size:22px;font-weight:500;color:rgba(255,255,255,0.4);margin:0;text-decoration:line-through">${data.oldPrice}</p>
          </div>
          <div style="font-size:20px;color:rgba(255,255,255,0.3)">→</div>
          <div>
            <p style="font-size:11px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.1em;margin:0 0 4px">New price</p>
            <p style="font-size:32px;font-weight:700;color:#f4b942;margin:0">${data.newPrice}</p>
          </div>
        </div>
        ${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date],['Time',data.time],['Provider',data.providerName]])}
        ${btn('View my quotes →', data.quotesUrl ?? `${APP_URL}/quotes/`)}
        <p style="font-size:12px;color:rgba(255,255,255,0.3);margin:12px 0 0">You can accept or decline this offer from your quotes page.</p>`
      ))
    }

    case 'offers_waiting_reminder': return {
      subject: `You have transfer offers waiting — ${data.pickup} → ${data.dropoff}`,
      html: wrap(card(
        'Offers waiting',
        'Good news — you have transfer offers waiting!',
        `<p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 16px">
          Hi ${data.customerName}, local providers have submitted their best prices for your trip. Log in to compare and accept the one you want.
        </p>
        <div style="background:rgba(244,185,66,0.08);border:1px solid rgba(244,185,66,0.2);border-radius:6px;padding:16px;margin:0 0 16px;text-align:center">
          <p style="font-size:32px;font-weight:700;color:#f4b942;margin:0">${data.offerCount}</p>
          <p style="font-size:12px;color:rgba(255,255,255,0.5);margin:4px 0 0;text-transform:uppercase;letter-spacing:0.1em">offer${data.offerCount > 1 ? 's' : ''} waiting</p>
        </div>
        ${rows([['Route',`${data.pickup} → ${data.dropoff}`],['Date',data.date]])}
        ${btn('View offers & accept →', data.quotesUrl ?? `${APP_URL}/quotes/`)}`
      ))
    }

    default: return { subject:'dalaman.me notification', html:wrap(`<div style="padding:20px"><p style="color:#fff">${JSON.stringify(data)}</p></div>`) }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', SERVICE_KEY)

    // --- AUTHORIZATION ---
    // This function sends email from our domain to arbitrary recipients, so it
    // must not be callable anonymously (the public anon key satisfies
    // verify_jwt but does not prove identity). Allow internal/cron callers
    // (service-role key) or any authenticated user; reject everyone else.
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
    if (token !== SERVICE_KEY) {
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }
    // --- end authorization ---

    const { type, to, providerUserId, customerId, data } = await req.json()
    if (!type) return new Response(JSON.stringify({ error:'type required' }), { status:400, headers:{ ...corsHeaders, 'Content-Type':'application/json' } })

    let recipient = to

    if (!recipient && (providerUserId || customerId)) {
      const userId = providerUserId || customerId
      const { data: user } = await supabase.from('users').select('email').eq('id', userId).single()
      if (user?.email) recipient = user.email
    }

    if (!recipient) return new Response(JSON.stringify({ error:'recipient could not be resolved' }), { status:400, headers:{ ...corsHeaders, 'Content-Type':'application/json' } })

    const { subject, html } = getTemplate(type, data)
    const sent = await sendEmail(recipient, subject, html)
    return new Response(JSON.stringify({ sent, subject, to: recipient }), { headers:{ ...corsHeaders, 'Content-Type':'application/json' } })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status:500, headers:{ ...corsHeaders, 'Content-Type':'application/json' } })
  }
})
