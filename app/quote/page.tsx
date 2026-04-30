'use client'
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
  const [tripType, setTripType] = useState<'oneway'|'return'>((urlParams.get('tripType') as any) ?? 'oneway')
  const [form, setForm] = useState({
    pickup: urlParams.get('pickup')?? '', dropoff: urlParams.get('dropoff')?? '',
    date: urlParams.get('date')?? '', time: urlParams.get('time')?? '14:00',
    passengers: urlParams.get('passengers')?? '2', luggage:'2',
    returnDate: urlParams.get('returnDate')?? '', returnTime: urlParams.get('returnTime')?? '10:00',
    flightNumber:'', notes:'',
  })

  useEffect(() => {
    supabase.from('locations').select('*').eq('is_active', true).order('sort_order').order('name')
      .then(({ data }: any) => { if (data) setLocations(data) })
  }, [])

  const airports = locations.filter(l => l.type==='airport')
  const destinations = locations.filter(l => l.type!=='airport')
  const canSubmit = form.pickup && form.dropoff && form.date && form.time
    && (tripType==='oneway' || (form.returnDate && form.returnTime))

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin/?redirect=/quote/'); return }
      const { data: request, error } = await supabase.from('quote_requests').insert({
        customer_id: user.id, pickup_location_id: form.pickup, dropoff_location_id: form.dropoff,
        pickup_time: `${form.date}T${form.time}:00`, passengers: parseInt(form.passengers),
        luggage: parseInt(form.luggage), trip_type: tripType,
        return_time: tripType==='return' ? `${form.returnDate}T${form.returnTime}:00` : null,
        flight_number: form.flightNumber||null, notes: form.notes||null, status:'open',
      }).select().single()
      if (error||!request) throw error
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-providers`, {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`},
        body: JSON.stringify({ requestId: request.id }),
      })
      setSubmitted(true)
    } catch(err) { console.error(err) }
    setSubmitting(false)
  }

  const inp = { width:'100%', fontSize:'14px', padding:'12px 10px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#ffffff', outline:'none', boxSizing:'border-box' as const, colorScheme:'dark' as any }
  const lbl = { fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)' }
  const card = { backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'20px', marginBottom:'12px' }

  if (submitted) return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'480px', margin:'0 auto', padding:'60px 20px', textAlign:'center'}}>
        <div style={{width:'64px', height:'64px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', border:'1px solid rgba(244,185,66,0.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:'28px'}}>✓</div>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'10px'}}>Request sent</p>
        <h1 style={{fontSize:'26px', fontWeight:'500', color:'#ffffff', marginBottom:'10px'}}>Quote request submitted</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', marginBottom:'8px', lineHeight:'1.6'}}>All approved providers have been notified. You will receive an email each time a provider submits an offer.</p>
        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'32px'}}>Prices are hidden until a provider responds. Your request is open for 48 hours.</p>
        <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap'}}>
          <a href="/quotes/" style={{padding:'12px 24px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'13px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>View my quotes →</a>
          <a href="/" style={{padding:'12px 24px', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.6)', borderRadius:'6px', fontSize:'13px', textDecoration:'none'}}>Back to home</a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'580px', margin:'0 auto', padding:'32px 16px 48px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'8px'}}>Free · No obligation</p>
        <h1 style={{fontSize:'28px', fontWeight:'500', color:'#ffffff', marginBottom:'6px'}}>Request a quote</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', marginBottom:'28px', lineHeight:'1.6'}}>Providers will respond with their best price. Pay your driver directly on transfer day.</p>

        <div style={card}>
          <div style={{display:'flex', gap:'0', marginBottom:'20px', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'6px', overflow:'hidden'}}>
            {(['oneway','return'] as const).map(tt => (
              <button key={tt} onClick={() => setTripType(tt)} style={{flex:1, padding:'11px', fontSize:'13px', fontWeight:tripType===tt?'500':'400', backgroundColor:tripType===tt?'#f4b942':'transparent', color:tripType===tt?'#0f1419':'rgba(255,255,255,0.4)', border:'none', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em'}}>
                {tt==='oneway'?'One way':'Return'}
              </button>
            ))}
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div><label style={lbl}>Pick-up</label>
              <select value={form.pickup} onChange={e => setForm(p=>({...p,pickup:e.target.value}))} style={inp}>
                <option value="">—</option>
                {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                {destinations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Drop-off</label>
              <select value={form.dropoff} onChange={e => setForm(p=>({...p,dropoff:e.target.value}))} style={inp}>
                <option value="">—</option>
                {destinations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} style={inp} /></div>
            <div><label style={lbl}>Time</label><input type="time" value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))} style={inp} /></div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            <div><label style={lbl}>Passengers</label>
              <select value={form.passengers} onChange={e => setForm(p=>({...p,passengers:e.target.value}))} style={inp}>
                {Array.from({length:14},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Suitcases</label>
              <select value={form.luggage} onChange={e => setForm(p=>({...p,luggage:e.target.value}))} style={inp}>
                {Array.from({length:15},(_,i)=>i).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          {tripType==='return' && (
            <div style={{borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'12px', marginTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
              <div><label style={lbl}>Return date</label><input type="date" value={form.returnDate} onChange={e => setForm(p=>({...p,returnDate:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>Return time</label><input type="time" value={form.returnTime} onChange={e => setForm(p=>({...p,returnTime:e.target.value}))} style={inp} /></div>
            </div>
          )}
        </div>

        <div style={card}>
          <p style={{fontSize:'10px', letterSpacing:'0.15em', color:'#f4b942', textTransform:'uppercase', marginBottom:'14px'}}>Additional details (optional)</p>
          <div style={{marginBottom:'12px'}}><label style={lbl}>Flight number</label><input type="text" value={form.flightNumber} onChange={e => setForm(p=>({...p,flightNumber:e.target.value}))} placeholder="TK 1234" style={inp} /></div>
          <div><label style={lbl}>Special requirements</label><textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))} placeholder="Child seat, wheelchair access..." rows={3} style={{...inp, resize:'none'}} /></div>
        </div>

        <button onClick={handleSubmit} disabled={submitting||!canSubmit} style={{width:'100%', backgroundColor:canSubmit?'#f4b942':'rgba(244,185,66,0.3)', color:canSubmit?'#0f1419':'rgba(255,255,255,0.3)', fontWeight:'600', fontSize:'14px', letterSpacing:'0.05em', textTransform:'uppercase', padding:'16px', borderRadius:'6px', border:'none', cursor:canSubmit?'pointer':'not-allowed'}}>
          {submitting?'Sending...':'Request quotes →'}
        </button>
        <p style={{textAlign:'center', fontSize:'12px', color:'rgba(255,255,255,0.3)', marginTop:'10px'}}>Free · No obligation · Pay your driver directly on transfer day</p>
      </div>
    </div>
  )
}

export default function QuotePage() {
  return <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#0f1419'}} />}><QuoteContent /></Suspense>
}
