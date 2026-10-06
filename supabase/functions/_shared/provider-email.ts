const APP_URL = Deno.env.get('APP_URL') ?? 'https://dalaman.me'

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
}

export function emailHtml(request: any) {
  const dt = new Date(request.pickup_time)
  // Pickup times are stored exactly as the customer typed them and must never
  // be converted. timeZone:'UTC' pins the render regardless of runtime locale.
  const dateStr = dt.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' })
  const timeStr = dt.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', timeZone:'UTC' })
  const rows = [
    ['Route', `${request.pickup?.name} → ${request.dropoff?.name}`],
    ['Date', dateStr], ['Time', timeStr],
    ['Passengers', String(request.passengers)],
    ['Trip type', request.trip_type === 'return' ? 'Return' : 'One way'],
    ...(request.flight_number ? [['Flight', request.flight_number]] : []),
    ...(request.notes ? [['Notes', request.notes]] : []),
  ].map(([l,v]) => `<tr><td style="padding:10px 12px;border-bottom:1px solid #2a2f36;font-size:12px;color:rgba(255,255,255,0.4);text-transform:uppercase;letter-spacing:0.08em;width:120px">${l}</td><td style="padding:10px 12px;border-bottom:1px solid #2a2f36;font-size:13px;color:#ffffff;font-weight:500">${escapeHtml(v)}</td></tr>`).join('')
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0f1419;font-family:Arial,Helvetica,sans-serif"><div style="background:#0f1419;padding:32px 16px"><div style="max-width:560px;margin:0 auto"><div style="padding:24px 0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px"><span style="font-size:12px;font-weight:700;letter-spacing:0.22em;color:#ffffff">DALAMAN.ME</span></div><div style="background:#1a1f26;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:32px;margin-bottom:20px"><p style="font-size:10px;letter-spacing:0.2em;color:#f4b942;text-transform:uppercase;margin:0 0 10px">New quote request</p><h1 style="font-size:22px;font-weight:500;color:#ffffff;margin:0 0 12px">A customer wants a transfer</h1><p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 20px">Submit your best price. This is blind bidding — you cannot see other providers' prices.</p><table style="width:100%;border-collapse:collapse;margin-bottom:20px">${rows}</table><div style="background:rgba(244,185,66,0.08);border:1px solid rgba(244,185,66,0.2);border-radius:6px;padding:12px 16px;margin-bottom:20px"><p style="font-size:12px;color:rgba(255,255,255,0.6);margin:0">View this request in your dashboard for its current deadline.</p></div><a href="${APP_URL}/provider/quotes/" style="display:inline-block;background:#f4b942;color:#0f1419;padding:13px 26px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none">Submit your offer →</a></div><div style="text-align:center;padding:16px"><p style="font-size:11px;color:rgba(255,255,255,0.25);margin:0">dalaman.me · <a href="${APP_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none">${APP_URL}</a></p></div><p style="font-size:11px;color:#ff0000;line-height:1.6;margin:16px 0 0;text-align:center;font-family:Arial,Helvetica,sans-serif">dalaman.me is an independent platform that connects travellers with local transfer providers. All bookings, agreements, and payments are made directly between the customer and the transfer company. dalaman.me accepts no financial liability and cannot guarantee the fulfilment of any transfer. In the event of a dispute, customers should contact their transfer provider directly.</p></div></div></body></html>`
}

