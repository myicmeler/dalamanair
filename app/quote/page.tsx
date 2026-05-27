'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

function QuoteContent() {
  const router = useRouter()
  const urlParams = useSearchParams()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [locations, setLocations] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isReturn, setIsReturn] = useState((urlParams.get('tripType') ?? 'oneway') === 'return')
  const [currency, setCurrency] = useState<'EUR'|'GBP'>('EUR')
  const [form, setForm] = useState({
    pickup: urlParams.get('pickup') ?? '', dropoff: urlParams.get('dropoff') ?? '',
    date: urlParams.get('date') ?? '', time: urlParams.get('time') ?? '14:00',
    passengers: urlParams.get('passengers') ?? '2', luggage: '2',
    flightNumber: '', notes: '',
    returnDate: urlParams.get('returnDate') ?? '', returnTime: urlParams.get('returnTime') ?? '10:00',
    returnPickup: urlParams.get('returnPickup') ?? '', returnDropoff: urlParams.get('returnDropoff') ?? '',
    returnPassengers: urlParams.get('returnPassengers') ?? '2', returnLuggage: urlParams.get('returnLuggage') ?? '2',
    returnFlightNumber: '', returnNotes: '',
  })

  useEffect(() => {
    supabase.from('locations').select('*').eq('is_active', true).order('name')
      .then(({ data }: any) => { if (data) setLocations(data) })
  }, [])

  const allSorted = [...locations].sort((a, b) => a.name.localeCompare(b.name, 'en'))

  function dateTooClose(dateStr: string): boolean {
    if (!dateStr) return false
    const pickup = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diffDays = (pickup.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return diffDays < 5
  }

  const tooClose = dateTooClose(form.date)
  const canSubmit = form.pickup && form.dropoff && form.date && form.time && !tooClose
    && (!isReturn || (form.returnDate && form.returnTime && form.returnPickup && form.returnDropoff))

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin/?redirect=/quote/'); return }
      const pickupDateTime = `${form.date}T${form.time}:00`
      const { data: request, error } = await supabase.from('quote_requests').insert({
        customer_id: user.id, pickup_location_id: form.pickup, dropoff_location_id: form.dropoff,
        pickup_time: pickupDateTime, passengers: parseInt(form.passengers),
        luggage: parseInt(form.luggage), trip_type: isReturn ? 'return' : 'oneway',
        flight_number: form.flightNumber || null, notes: form.notes || null, status: 'open',
        expires_at: pickupDateTime, currency,
        return_time: isReturn ? `${form.returnDate}T${form.returnTime}:00` : null,
        return_pickup_location_id: isReturn ? form.returnPickup || null : null,
        return_dropoff_location_id: isReturn ? form.returnDropoff || null : null,
        return_passengers: isReturn ? parseInt(form.returnPassengers) : null,
        return_luggage: isReturn ? parseInt(form.returnLuggage) : null,
        return_flight_number: isReturn ? form.returnFlightNumber || null : null,
        return_notes: isReturn ? form.returnNotes || null : null,
      }).select().single()
      if (error || !request) throw error
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-providers`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ requestId: request.id }),
      })
      setSubmitted(true)
    } catch (err) { console.error(err) }
    setSubmitting(false)
  }

  const inp = { width: '100%', fontSize: '16px', padding: '13px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' as const, colorScheme: 'dark' as any }
  const lbl = { fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }
  const card = { backgroundColor: '#1a1f26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', marginBottom: '12px' }

  if (submitted) return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1419' }}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(244,185,66,0.15)', border: '1px solid rgba(244,185,66,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px' }}>✓</div>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '10px' }}>Request sent</p>
        <h1 style={{ fontSize: '26px', fontWeight: '500', color: '#ffffff', marginBottom: '10px' }}>Quote request submitted</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', lineHeight: '1.6' }}>All approved providers have been notified. You will receive an email each time a provider submits an offer.</p>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '32px' }}>Prices are hidden until a provider responds.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          <a href="/quotes/" style={{ width: '100%', maxWidth: '300px', padding: '14px 24px', backgroundColor: '#f4b942', color: '#0f1419', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', display: 'block' }}>View my quotes →</a>
          <a href="/" style={{ padding: '12px 24px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: '6px', fontSize: '13px', textDecoration: 'none' }}>Back to home</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f1419' }}>
      <style>{`
        * { box-sizing: border-box; }
        @media(max-width:600px) {
          .quote-grid { grid-template-columns: 1fr !important; }
          .quote-wrap { padding: 20px 16px 40px !important; }
        }
      `}</style>
      <Nav lang={lang} onLangChange={setLang} />
      <div className="quote-wrap" style={{ maxWidth: '580px', margin: '0 auto', padding: '32px 16px 48px' }}>

        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '8px' }}>Free · No obligation</p>
        <h1 style={{ fontSize: 'clamp(22px,5vw,28px)', fontWeight: '500', color: '#ffffff', marginBottom: '6px' }}>Request a quote</h1>
        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '24px', lineHeight: '1.6' }}>Providers respond with their best price. Pay your driver directly on transfer day.</p>

        {/* CURRENCY SELECTOR */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Preferred currency</p>
          <div style={{ display: 'flex', gap: '10px' }}>
            {(['EUR', 'GBP'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{
                flex: 1, padding: '14px', borderRadius: '6px', border: `2px solid ${currency === c ? '#f4b942' : 'rgba(255,255,255,0.1)'}`,
                backgroundColor: currency === c ? 'rgba(244,185,66,0.1)' : 'rgba(255,255,255,0.03)',
                color: currency === c ? '#f4b942' : 'rgba(255,255,255,0.5)',
                cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
              }}>
                <span style={{ fontSize: '22px', fontWeight: '700' }}>{c === 'EUR' ? '€' : '£'}</span>
                <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{c === 'EUR' ? 'Euro' : 'British Pound'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* OUTBOUND */}
        <div style={card}>
          <p style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '14px' }}>Outbound journey</p>

          <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Pick-up</label>
              <select value={form.pickup} onChange={e => setForm(p => ({ ...p, pickup: e.target.value }))} style={inp}>
                <option value="">—</option>
                {allSorted.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Drop-off</label>
              <select value={form.dropoff} onChange={e => setForm(p => ({ ...p, dropoff: e.target.value }))} style={inp}>
                <option value="">—</option>
                {allSorted.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={lbl}>Date</label>
              <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} style={{ ...inp, borderColor: tooClose ? '#e53e3e' : 'rgba(255,255,255,0.12)' }} />
              {tooClose && <p style={{ fontSize: '11px', color: '#e53e3e', marginTop: '6px', lineHeight: '1.5' }}>⚠️ Transfer date is less than 5 days away. Please choose a later date.</p>}
            </div>
            <div><label style={lbl}>Time</label><input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} style={inp} /></div>
          </div>

          <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div><label style={lbl}>Passengers</label>
              <select value={form.passengers} onChange={e => setForm(p => ({ ...p, passengers: e.target.value }))} style={inp}>
                {Array.from({ length: 14 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Suitcases</label>
              <select value={form.luggage} onChange={e => setForm(p => ({ ...p, luggage: e.target.value }))} style={inp}>
                {Array.from({ length: 15 }, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '12px' }}><label style={lbl}>Flight number (optional)</label><input type="text" value={form.flightNumber} onChange={e => setForm(p => ({ ...p, flightNumber: e.target.value }))} placeholder="TK 1234" style={inp} /></div>
          <div><label style={lbl}>Special requirements (optional)</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Child seat, wheelchair access..." rows={2} style={{ ...inp, resize: 'none' }} /></div>
        </div>

        {/* RETURN CHECKBOX */}
        <div
          onClick={() => setIsReturn(p => !p)}
          style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '14px', marginBottom: '12px', backgroundColor: isReturn ? 'rgba(244,185,66,0.08)' : 'rgba(255,255,255,0.03)', border: `1px solid ${isReturn ? 'rgba(244,185,66,0.3)' : 'rgba(255,255,255,0.08)'}`, borderRadius: '6px', userSelect: 'none' }}
        >
          <div style={{ width: '20px', height: '20px', borderRadius: '4px', border: `2px solid ${isReturn ? '#f4b942' : 'rgba(255,255,255,0.3)'}`, backgroundColor: isReturn ? '#f4b942' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>
            {isReturn && <span style={{ color: '#0f1419', fontSize: '13px', fontWeight: '700', lineHeight: 1 }}>✓</span>}
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '500', color: '#ffffff' }}>Add return journey</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>I need a transfer back on a different date</div>
          </div>
        </div>

        {/* RETURN FIELDS */}
        {isReturn && (
          <div style={card}>
            <p style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '14px' }}>Return journey</p>

            <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Return pick-up</label>
                <select value={form.returnPickup} onChange={e => setForm(p => ({ ...p, returnPickup: e.target.value }))} style={inp}>
                  <option value="">—</option>
                  {allSorted.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Return drop-off</label>
                <select value={form.returnDropoff} onChange={e => setForm(p => ({ ...p, returnDropoff: e.target.value }))} style={inp}>
                  <option value="">—</option>
                  {allSorted.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Return date</label><input type="date" value={form.returnDate} onChange={e => setForm(p => ({ ...p, returnDate: e.target.value }))} style={inp} /></div>
              <div><label style={lbl}>Return time</label><input type="time" value={form.returnTime} onChange={e => setForm(p => ({ ...p, returnTime: e.target.value }))} style={inp} /></div>
            </div>

            <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label style={lbl}>Return passengers</label>
                <select value={form.returnPassengers} onChange={e => setForm(p => ({ ...p, returnPassengers: e.target.value }))} style={inp}>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Return suitcases</label>
                <select value={form.returnLuggage} onChange={e => setForm(p => ({ ...p, returnLuggage: e.target.value }))} style={inp}>
                  {Array.from({ length: 15 }, (_, i) => i).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '12px' }}><label style={lbl}>Return flight number (optional)</label><input type="text" value={form.returnFlightNumber} onChange={e => setForm(p => ({ ...p, returnFlightNumber: e.target.value }))} placeholder="TK 5678" style={inp} /></div>
            <div><label style={lbl}>Return special requirements (optional)</label><textarea value={form.returnNotes} onChange={e => setForm(p => ({ ...p, returnNotes: e.target.value }))} placeholder="Child seat, wheelchair access..." rows={2} style={{ ...inp, resize: 'none' }} /></div>
          </div>
        )}

        <button onClick={handleSubmit} disabled={submitting || !canSubmit} style={{ width: '100%', backgroundColor: canSubmit ? '#f4b942' : 'rgba(244,185,66,0.3)', color: canSubmit ? '#0f1419' : 'rgba(255,255,255,0.3)', fontWeight: '600', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '16px', borderRadius: '6px', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
          {submitting ? 'Sending...' : 'Request quotes →'}
        </button>
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>Free · No obligation · Pay your driver directly on transfer day</p>
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(244,185,66,0.5)', marginTop: '24px', lineHeight: '1.6', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>dalaman.me is an independent platform that connects travellers with local transfer providers. All bookings, agreements, and payments are made directly between the customer and the transfer company. dalaman.me accepts no financial liability and cannot guarantee the fulfilment of any transfer.</p>
      </div>
    </div>
  )
}

export default function QuotePage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#0f1419' }} />}><QuoteContent /></Suspense>
}
