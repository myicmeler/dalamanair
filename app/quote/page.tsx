'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'
import { callFunction } from '@/lib/functions'

// ---- Country dial codes for the Phone / WhatsApp field ----
type DialCode = { iso: string; name: string; dial: string; flag: string }
const COMMON_CODES: DialCode[] = [
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { iso: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
]
const ALL_CODES: DialCode[] = [
  { iso: 'AL', name: 'Albania', dial: '+355', flag: '🇦🇱' },
  { iso: 'AT', name: 'Austria', dial: '+43', flag: '🇦🇹' },
  { iso: 'AU', name: 'Australia', dial: '+61', flag: '🇦🇺' },
  { iso: 'BE', name: 'Belgium', dial: '+32', flag: '🇧🇪' },
  { iso: 'BG', name: 'Bulgaria', dial: '+359', flag: '🇧🇬' },
  { iso: 'BA', name: 'Bosnia & Herzegovina', dial: '+387', flag: '🇧🇦' },
  { iso: 'CA', name: 'Canada', dial: '+1', flag: '🇨🇦' },
  { iso: 'HR', name: 'Croatia', dial: '+385', flag: '🇭🇷' },
  { iso: 'CY', name: 'Cyprus', dial: '+357', flag: '🇨🇾' },
  { iso: 'CZ', name: 'Czechia', dial: '+420', flag: '🇨🇿' },
  { iso: 'DK', name: 'Denmark', dial: '+45', flag: '🇩🇰' },
  { iso: 'EE', name: 'Estonia', dial: '+372', flag: '🇪🇪' },
  { iso: 'FI', name: 'Finland', dial: '+358', flag: '🇫🇮' },
  { iso: 'FR', name: 'France', dial: '+33', flag: '🇫🇷' },
  { iso: 'DE', name: 'Germany', dial: '+49', flag: '🇩🇪' },
  { iso: 'GR', name: 'Greece', dial: '+30', flag: '🇬🇷' },
  { iso: 'HU', name: 'Hungary', dial: '+36', flag: '🇭🇺' },
  { iso: 'IS', name: 'Iceland', dial: '+354', flag: '🇮🇸' },
  { iso: 'IN', name: 'India', dial: '+91', flag: '🇮🇳' },
  { iso: 'IE', name: 'Ireland', dial: '+353', flag: '🇮🇪' },
  { iso: 'IL', name: 'Israel', dial: '+972', flag: '🇮🇱' },
  { iso: 'IT', name: 'Italy', dial: '+39', flag: '🇮🇹' },
  { iso: 'LV', name: 'Latvia', dial: '+371', flag: '🇱🇻' },
  { iso: 'LT', name: 'Lithuania', dial: '+370', flag: '🇱🇹' },
  { iso: 'LU', name: 'Luxembourg', dial: '+352', flag: '🇱🇺' },
  { iso: 'MT', name: 'Malta', dial: '+356', flag: '🇲🇹' },
  { iso: 'MD', name: 'Moldova', dial: '+373', flag: '🇲🇩' },
  { iso: 'ME', name: 'Montenegro', dial: '+382', flag: '🇲🇪' },
  { iso: 'NL', name: 'Netherlands', dial: '+31', flag: '🇳🇱' },
  { iso: 'NZ', name: 'New Zealand', dial: '+64', flag: '🇳🇿' },
  { iso: 'MK', name: 'North Macedonia', dial: '+389', flag: '🇲🇰' },
  { iso: 'NO', name: 'Norway', dial: '+47', flag: '🇳🇴' },
  { iso: 'PL', name: 'Poland', dial: '+48', flag: '🇵🇱' },
  { iso: 'PT', name: 'Portugal', dial: '+351', flag: '🇵🇹' },
  { iso: 'RO', name: 'Romania', dial: '+40', flag: '🇷🇴' },
  { iso: 'RS', name: 'Serbia', dial: '+381', flag: '🇷🇸' },
  { iso: 'SK', name: 'Slovakia', dial: '+421', flag: '🇸🇰' },
  { iso: 'SI', name: 'Slovenia', dial: '+386', flag: '🇸🇮' },
  { iso: 'ZA', name: 'South Africa', dial: '+27', flag: '🇿🇦' },
  { iso: 'ES', name: 'Spain', dial: '+34', flag: '🇪🇸' },
  { iso: 'SE', name: 'Sweden', dial: '+46', flag: '🇸🇪' },
  { iso: 'CH', name: 'Switzerland', dial: '+41', flag: '🇨🇭' },
  { iso: 'TR', name: 'Turkey', dial: '+90', flag: '🇹🇷' },
  { iso: 'UA', name: 'Ukraine', dial: '+380', flag: '🇺🇦' },
  { iso: 'AE', name: 'United Arab Emirates', dial: '+971', flag: '🇦🇪' },
  { iso: 'GB', name: 'United Kingdom', dial: '+44', flag: '🇬🇧' },
  { iso: 'US', name: 'United States', dial: '+1', flag: '🇺🇸' },
]
const findDial = (iso: string) =>
  [...COMMON_CODES, ...ALL_CODES].find(c => c.iso === iso)?.dial ?? '+44'

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
  const [phoneCountry, setPhoneCountry] = useState('GB')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [form, setForm] = useState({
    pickup: urlParams.get('pickup') ?? '', dropoff: urlParams.get('dropoff') ?? '',
    date: urlParams.get('date') ?? '', time: urlParams.get('time') ?? '14:00',
    passengers: urlParams.get('passengers') ?? '2', luggage: '2',
    flightNumber: '', notes: '', hotelName: '',
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

  // Phone / WhatsApp -> clean international number (e.g. +447700900123)
  const phoneNational = phoneNumber.replace(/\D/g, '').replace(/^0+/, '')
  const phoneE164 = phoneNational ? `${findDial(phoneCountry)}${phoneNational}` : ''
  const phoneValid = phoneNational.length >= 6 && phoneNational.length <= 14

  const tooClose = dateTooClose(form.date)

  // The return leg must be after the outbound. A customer once submitted a
  // return four hours BEFORE his arrival on the same day, and six providers bid
  // on an impossible journey before anyone noticed. Compare the full date AND
  // time: a same-day return is legitimate, a same-day-but-earlier one is not.
  const returnBeforeOutbound = Boolean(
    isReturn && form.date && form.time && form.returnDate && form.returnTime &&
    new Date(`${form.returnDate}T${form.returnTime}:00`) <= new Date(`${form.date}T${form.time}:00`)
  )

  const canSubmit = form.pickup && form.dropoff && form.date && form.time && !tooClose
    && form.flightNumber.trim() && form.hotelName.trim() && phoneValid
    && (!isReturn || (form.returnDate && form.returnTime && form.returnPickup && form.returnDropoff && form.returnFlightNumber.trim()))
    && !returnBeforeOutbound

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
        flight_number: form.flightNumber.trim() || null, notes: form.notes || null, status: 'open',
        hotel_name: form.hotelName.trim() || null, contact_phone: phoneE164 || null,
        expires_at: pickupDateTime, currency,
        return_time: isReturn ? `${form.returnDate}T${form.returnTime}:00` : null,
        return_pickup_location_id: isReturn ? form.returnPickup || null : null,
        return_dropoff_location_id: isReturn ? form.returnDropoff || null : null,
        return_passengers: isReturn ? parseInt(form.returnPassengers) : null,
        return_luggage: isReturn ? parseInt(form.returnLuggage) : null,
        return_flight_number: isReturn ? form.returnFlightNumber.trim() || null : null,
        return_notes: isReturn ? form.returnNotes || null : null,
      }).select().single()
      if (error || !request) throw error

      await callFunction('notify-providers', { requestId: request.id })

      // Confirm to the customer that the request was received.
      //
      // The quote_submitted template has existed since the start but nothing
      // ever called it — this page only notified providers, and no trigger sent
      // it either, so customers received NOTHING after submitting. Added
      // 31 Aug 2026.
      //
      // Best-effort and after the insert: the request is already saved, so a
      // Mailgun failure must never make a successful submission look failed.
      try {
        const closesOn = new Date(new Date(`${form.date}T00:00:00Z`).getTime() - 3 * 864e5)
        await callFunction('send-email', {
          type: 'quote_submitted',
          customerId: user.id,
          data: {
            pickup: locations.find(l => l.id === form.pickup)?.name,
            dropoff: locations.find(l => l.id === form.dropoff)?.name,
            // timeZone:'UTC' — show the date and time exactly as entered
            date: new Date(pickupDateTime).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', timeZone:'UTC' }),
            time: form.time,
            passengers: form.passengers,
            tripType: isReturn ? 'return' : 'oneway',
            // The request closes 3 days before travel (cron job 13). Sending the
            // actual date saves the customer doing the arithmetic.
            closesOn: closesOn.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', timeZone:'UTC' }),
          },
        })
      } catch (e) { console.error('quote-submitted email error:', e) }

      setSubmitted(true)
    } catch (err) { console.error(err) }
    setSubmitting(false)
  }

  const inp = { width: '100%', fontSize: '16px', padding: '13px 12px', background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' as const, colorScheme: 'dark' as any }
  const lbl = { fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' as const, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '6px' }
  const card = { backgroundColor: '#1a1f26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '20px', marginBottom: '12px' }

  if (submitted) return (
    <>
      <div style={{ minHeight: '100vh', backgroundColor: '#0f1419' }}>
        <Nav lang={lang} onLangChange={setLang} />
        <div style={{ maxWidth: '480px', margin: '0 auto', padding: '48px 20px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'rgba(244,185,66,0.15)', border: '1px solid rgba(244,185,66,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '28px' }}>✓</div>
          <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '10px' }}>Request sent</p>
          <h1 style={{ fontSize: '26px', fontWeight: '500', color: '#ffffff', marginBottom: '10px' }}>Quote request submitted</h1>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', lineHeight: '1.6' }}>All approved providers have been notified. You will receive an email each time a provider submits an offer.</p>
          {/* ADDED: time-accuracy confirmation line */}
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginBottom: '8px', lineHeight: '1.6' }}>The dates and times you entered are used <strong style={{ color: 'rgba(255,255,255,0.7)' }}>exactly as submitted</strong>. Please review them in your quotes — if anything needs changing, contact us to correct it.</p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginBottom: '20px' }}>Prices are hidden until a provider responds.</p>

          {/* Customers who arrange their own transfer rarely come back to cancel,
              which leaves providers holding a slot and the request sitting open
              until cron 13 expires it. Email does not reach these customers —
              that is why the acknowledge step was removed in August — so the ask
              is made here, at the moment they are actually looking at the screen.
              Deliberately prominent, and framed as a courtesy to the drivers
              rather than an invitation to book elsewhere. */}
          <div style={{ backgroundColor: 'rgba(244,185,66,0.1)', border: '1px solid rgba(244,185,66,0.35)', borderRadius: '8px', padding: '18px 20px', marginBottom: '28px', textAlign: 'left' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#f4b942', margin: '0 0 8px' }}>
              Plans sometimes change, and that's absolutely fine
            </p>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.75)', lineHeight: '1.7', margin: 0 }}>
              Should you end up making other arrangements, we'd really appreciate a quick note to cancel your request — it lets the local drivers know they're free, and saves them holding time for you. Thank you.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
            <a href="/quotes/" style={{ width: '100%', maxWidth: '300px', padding: '14px 24px', backgroundColor: '#f4b942', color: '#0f1419', borderRadius: '6px', fontSize: '13px', fontWeight: '500', textDecoration: 'none', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'center', display: 'block' }}>View my quotes →</a>
            <a href="/" style={{ padding: '12px 24px', border: '1px solid rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)', borderRadius: '6px', fontSize: '13px', textDecoration: 'none' }}>Back to home</a>
          </div>
        </div>
      </div>
    </>
  )

  return (
    <>
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

          {/* TRIP TYPE — was a checkbox below "Your details", which customers kept
              missing: two of them submitted a second one-way request minutes
              later instead of ticking it. Promoted to the same two-button
              pattern as the currency selector, and moved to the top so it is a
              decision made before describing the journey rather than an
              afterthought next to the submit button. */}
          <div style={{ marginBottom: '12px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Trip type</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              {([false, true] as const).map(ret => (
                <button key={String(ret)} onClick={() => setIsReturn(ret)} style={{
                  flex: 1, padding: '14px', borderRadius: '6px', border: `2px solid ${isReturn === ret ? '#f4b942' : 'rgba(255,255,255,0.1)'}`,
                  backgroundColor: isReturn === ret ? 'rgba(244,185,66,0.1)' : 'rgba(255,255,255,0.03)',
                  color: isReturn === ret ? '#f4b942' : 'rgba(255,255,255,0.5)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px'
                }}>
                  <span style={{ fontSize: '20px', fontWeight: '700' }}>{ret ? '⇄' : '→'}</span>
                  <span style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{ret ? 'Return' : 'One way'}</span>
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

            {/* Moved here from just above the submit button, where it was the
                loudest thing on the page and drowned out the trip-type control.
                It belongs beside the fields it is about. */}
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: '1.6', margin: '0 0 12px' }}>
              ⏱ <strong style={{ color: 'rgba(244,185,66,0.85)' }}>Double-check your dates and times.</strong> We use them exactly as entered and never convert them. If you spot a mistake after sending, contact us and we'll correct it.
            </p>

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

            <div style={{ marginBottom: '12px' }}><label style={lbl}>Flight number</label><input type="text" value={form.flightNumber} onChange={e => setForm(p => ({ ...p, flightNumber: e.target.value }))} placeholder="TK 1234" style={inp} /></div>
            <div><label style={lbl}>Special requirements (optional)</label><textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Child seat, wheelchair access..." rows={2} style={{ ...inp, resize: 'none' }} /></div>
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

              <div className="quote-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: returnBeforeOutbound ? '6px' : '12px' }}>
                <div><label style={lbl}>Return date</label><input type="date" value={form.returnDate} onChange={e => setForm(p => ({ ...p, returnDate: e.target.value }))} style={{ ...inp, borderColor: returnBeforeOutbound ? '#e53e3e' : 'rgba(255,255,255,0.12)' }} /></div>
                <div><label style={lbl}>Return time</label><input type="time" value={form.returnTime} onChange={e => setForm(p => ({ ...p, returnTime: e.target.value }))} style={{ ...inp, borderColor: returnBeforeOutbound ? '#e53e3e' : 'rgba(255,255,255,0.12)' }} /></div>
              </div>
              {returnBeforeOutbound && (
                <p style={{ fontSize: '11px', color: '#e53e3e', margin: '0 0 12px', lineHeight: '1.5' }}>
                  ⚠️ Your return journey is before your outbound arrival. Check the return date — it should be the day you fly home, not the day you arrive.
                </p>
              )}

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

              <div style={{ marginBottom: '12px' }}><label style={lbl}>Return flight number</label><input type="text" value={form.returnFlightNumber} onChange={e => setForm(p => ({ ...p, returnFlightNumber: e.target.value }))} placeholder="TK 5678" style={inp} /></div>
              <div><label style={lbl}>Return special requirements (optional)</label><textarea value={form.returnNotes} onChange={e => setForm(p => ({ ...p, returnNotes: e.target.value }))} placeholder="Child seat, wheelchair access..." rows={2} style={{ ...inp, resize: 'none' }} /></div>
            </div>
          )}

          {/* CONTACT & HOTEL */}
          <div style={card}>
            <p style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '14px' }}>Your details</p>

            <div style={{ marginBottom: '12px' }}>
              <label style={lbl}>Hotel name</label>
              <input type="text" value={form.hotelName} onChange={e => setForm(p => ({ ...p, hotelName: e.target.value }))} placeholder="e.g. Marti Resort, Içmeler" style={inp} />
            </div>

            <div>
              <label style={lbl}>Phone / WhatsApp</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select aria-label="Country code" value={phoneCountry} onChange={e => setPhoneCountry(e.target.value)} style={{ ...inp, flex: '0 0 150px' }}>
                  <optgroup label="Common">
                    {COMMON_CODES.map(c => <option key={'c-' + c.iso} value={c.iso}>{c.flag} {c.dial} {c.name}</option>)}
                  </optgroup>
                  <optgroup label="All countries">
                    {ALL_CODES.map(c => <option key={c.iso} value={c.iso}>{c.flag} {c.dial} {c.name}</option>)}
                  </optgroup>
                </select>
                <input type="tel" inputMode="numeric" autoComplete="tel-national" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} placeholder="7700 900123" style={{ ...inp, flex: 1 }} />
              </div>
              <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>Used by your driver on the day — WhatsApp ideal.</p>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={submitting || !canSubmit} style={{ width: '100%', backgroundColor: canSubmit ? '#f4b942' : 'rgba(244,185,66,0.3)', color: canSubmit ? '#0f1419' : 'rgba(255,255,255,0.3)', fontWeight: '600', fontSize: '15px', letterSpacing: '0.05em', textTransform: 'uppercase', padding: '16px', borderRadius: '6px', border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed' }}>
            {submitting ? 'Sending...' : 'Request quotes →'}
          </button>
          <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>Free · No obligation · Pay your driver directly on transfer day</p>
          <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(244,185,66,0.5)', marginTop: '24px', lineHeight: '1.6', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>dalaman.me is an independent platform that connects travellers with local transfer providers. All bookings, agreements, and payments are made directly between the customer and the transfer company. dalaman.me accepts no financial liability and cannot guarantee the fulfilment of any transfer.</p>
        </div>
      </div>
    </>
  )
}

export default function QuotePage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', backgroundColor: '#0f1419' }} />}><QuoteContent /></Suspense>
}
