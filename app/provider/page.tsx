'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

export default function QuotePage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [locations, setLocations] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [tripType, setTripType] = useState<'oneway'|'return'>('oneway')
  const [form, setForm] = useState({
    pickup:'', dropoff:'', date:'', time:'14:00',
    passengers:'2', luggage:'2',
    returnDate:'', returnTime:'10:00',
    flightNumber:'', notes:'',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('locations').select('*').eq('is_active', true).order('sort_order').order('name')
      if (data) setLocations(data)
    }
    load()
  }, [])

  const airports = locations.filter(l => l.type === 'airport')
  const destinations = locations.filter(l => l.type !== 'airport')
  const canSubmit = form.pickup && form.dropoff && form.date && form.time
    && (tripType === 'oneway' || (form.returnDate && form.returnTime))

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin?redirect=/quote'); return }

      const { data: request, error } = await supabase.from('quote_requests').insert({
        customer_id:         user.id,
        pickup_location_id:  form.pickup,
        dropoff_location_id: form.dropoff,
        pickup_time:         `${form.date}T${form.time}:00`,
        passengers:          parseInt(form.passengers),
        luggage:             parseInt(form.luggage),
        trip_type:           tripType,
        return_time:         tripType === 'return' ? `${form.returnDate}T${form.returnTime}:00` : null,
        flight_number:       form.flightNumber || null,
        notes:               form.notes || null,
        status:              'open',
      }).select().single()

      if (error || !request) throw error

      // Notify all providers via Edge Function
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ requestId: request.id }),
      })

      setSubmitted(true)
    } catch (err) {
      console.error(err)
    }
    setSubmitting(false)
  }

  const inputStyle = { width:'100%', fontSize:'15px', padding:'13px 12px', marginTop:'4px' }
  const labelStyle = { fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'#8a8680' }

  if (submitted) return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'480px', margin:'0 auto', padding:'60px 20px', textAlign:'center'}}>
        <div style={{width:'64px', height:'64px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 24px', fontSize:'28px'}}>✓</div>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'10px'}}>Request sent</p>
        <h1 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419', marginBottom:'10px'}}>Quote request submitted</h1>
        <p style={{fontSize:'14px', color:'#5a574f', marginBottom:'8px', lineHeight:'1.6'}}>
          All approved providers have been notified by email. You will receive an email for each offer that comes in.
        </p>
        <p style={{fontSize:'13px', color:'#8a8680', marginBottom:'32px'}}>Offers usually arrive within a few hours. Your request is open for 48 hours.</p>
        <div style={{display:'flex', gap:'12px', justifyContent:'center', flexWrap:'wrap'}}>
          <a href="/quotes" style={{padding:'12px 24px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'13px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>
            View my quotes →
          </a>
          <a href="/" style={{padding:'12px 24px', border:'1px solid #e5e3dd', color:'#5a574f', borderRadius:'6px', fontSize:'13px', textDecoration:'none'}}>
            Back to home
          </a>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'580px', margin:'0 auto', padding:'32px 16px 48px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'8px'}}>Free · No obligation</p>
        <h1 style={{fontSize:'28px', fontWeight:'500', color:'#0f1419', marginBottom:'6px'}}>Request a quote</h1>
        <p style={{fontSize:'14px', color:'#5a574f', marginBottom:'28px', lineHeight:'1.6'}}>
          Tell us about your transfer and all our approved providers will send you their best price. You choose the offer you like.
        </p>

        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'20px', marginBottom:'12px'}}>
          <div style={{display:'flex', gap:'0', marginBottom:'20px', border:'1px solid #e5e3dd', borderRadius:'6px', overflow:'hidden'}}>
            {(['oneway','return'] as const).map(tt => (
              <button key={tt} onClick={() => setTripType(tt)} style={{
                flex:1, padding:'11px', fontSize:'13px',
                fontWeight:tripType===tt?'500':'400',
                backgroundColor:tripType===tt?'#0f1419':'transparent',
                color:tripType===tt?'#ffffff':'#8a8680',
                border:'none', cursor:'pointer', transition:'all 0.15s',
                textTransform:'uppercase', letterSpacing:'0.05em',
              }}>
                {tt === 'oneway' ? (lang==='en'?'One way':'Tek yön') : (lang==='en'?'Return':'Gidiş-dönüş')}
              </button>
            ))}
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div>
              <label style={labelStyle}>{lang==='en'?'Pick-up':'Alış'}</label>
              <select value={form.pickup} onChange={e => setForm(p=>({...p,pickup:e.target.value}))} style={inputStyle}>
                <option value="">—</option>
                {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                {destinations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{lang==='en'?'Drop-off':'Varış'}</label>
              <select value={form.dropoff} onChange={e => setForm(p=>({...p,dropoff:e.target.value}))} style={inputStyle}>
                <option value="">—</option>
                {destinations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div>
              <label style={labelStyle}>{lang==='en'?'Date':'Tarih'}</label>
              <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{lang==='en'?'Time':'Saat'}</label>
              <input type="time" value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))} style={inputStyle} />
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:tripType==='return'?'12px':'0'}}>
            <div>
              <label style={labelStyle}>{lang==='en'?'Passengers':'Yolcular'}</label>
              <select value={form.passengers} onChange={e => setForm(p=>({...p,passengers:e.target.value}))} style={inputStyle}>
                {Array.from({length:14},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>{lang==='en'?'Suitcases':'Bavul'}</label>
              <select value={form.luggage} onChange={e => setForm(p=>({...p,luggage:e.target.value}))} style={inputStyle}>
                {Array.from({length:15},(_,i)=>i).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          {tripType === 'return' && (
            <div style={{borderTop:'1px solid #e5e3dd', paddingTop:'12px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
              <div>
                <label style={labelStyle}>{lang==='en'?'Return date':'Dönüş tarihi'}</label>
                <input type="date" value={form.returnDate} onChange={e => setForm(p=>({...p,returnDate:e.target.value}))} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>{lang==='en'?'Return time':'Dönüş saati'}</label>
                <input type="time" value={form.returnTime} onChange={e => setForm(p=>({...p,returnTime:e.target.value}))} style={inputStyle} />
              </div>
            </div>
          )}
        </div>

        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'20px', marginBottom:'16px'}}>
          <p style={{fontSize:'10px', letterSpacing:'0.15em', color:'#e0a528', textTransform:'uppercase', marginBottom:'14px'}}>
            {lang==='en'?'Additional details (optional)':'Ek bilgiler (isteğe bağlı)'}
          </p>
          <div style={{marginBottom:'12px'}}>
            <label style={labelStyle}>{lang==='en'?'Flight number':'Uçuş numarası'}</label>
            <input type="text" value={form.flightNumber} onChange={e => setForm(p=>({...p,flightNumber:e.target.value}))} placeholder="TK 1234" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>{lang==='en'?'Special requirements':'Özel istekler'}</label>
            <textarea value={form.notes} onChange={e => setForm(p=>({...p,notes:e.target.value}))}
              placeholder={lang==='en'?'Child seat, wheelchair access, large luggage...':'Çocuk koltuğu, tekerlekli sandalye, büyük bagaj...'}
              rows={3} style={{...inputStyle, resize:'none'}} />
          </div>
        </div>

        <div style={{backgroundColor:'#f5f2ea', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.15em', color:'#8a8680', textTransform:'uppercase', marginBottom:'12px'}}>
            {lang==='en'?'How it works':'Nasıl çalışır'}
          </p>
          {[
            {n:'1', t:lang==='en'?'Submit your request':'Talebinizi gönderin', d:lang==='en'?'All approved providers are notified immediately by email':'Tüm onaylı sağlayıcılar anında e-posta ile bildirim alır'},
            {n:'2', t:lang==='en'?'Receive offers':'Teklifleri alın', d:lang==='en'?'Providers send their best price — you get an email for each one':'Sağlayıcılar en iyi fiyatlarını gönderir'},
            {n:'3', t:lang==='en'?'Accept the best offer':'En iyi teklifi kabul edin', d:lang==='en'?'One click to confirm. Pay the driver on the day.':'Bir tıkla onaylayın. Ödemeyi günü yapın.'},
          ].map(s => (
            <div key={s.n} style={{display:'flex', gap:'12px', marginBottom:'10px', alignItems:'flex-start'}}>
              <div style={{width:'22px', height:'22px', borderRadius:'50%', backgroundColor:'#f4b942', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:'600', color:'#0f1419', flexShrink:0, marginTop:'1px'}}>
                {s.n}
              </div>
              <div>
                <div style={{fontSize:'13px', fontWeight:'500', color:'#0f1419', marginBottom:'2px'}}>{s.t}</div>
                <div style={{fontSize:'12px', color:'#8a8680'}}>{s.d}</div>
              </div>
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={submitting || !canSubmit} style={{
          width:'100%', backgroundColor:canSubmit?'#f4b942':'#fad98a',
          color:'#0f1419', fontWeight:'600', fontSize:'14px',
          letterSpacing:'0.05em', textTransform:'uppercase',
          padding:'16px', borderRadius:'6px', border:'none',
          cursor:canSubmit?'pointer':'not-allowed',
        }}>
          {submitting ? (lang==='en'?'Sending...':'Gönderiliyor...') : (lang==='en'?'Request quotes →':'Teklif iste →')}
        </button>
        <p style={{textAlign:'center', fontSize:'12px', color:'#8a8680', marginTop:'10px'}}>
          {lang==='en'?'Free · No obligation · Providers notified instantly':'Ücretsiz · Bağlayıcı değil · Sağlayıcılar anında bildirim alır'}
        </p>
      </div>
    </div>
  )
}
