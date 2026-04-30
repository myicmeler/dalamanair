'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

function SearchContent() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const pickup = params.get('pickup') ?? ''
  const dropoff = params.get('dropoff') ?? ''
  const date = params.get('date') ?? ''
  const time = params.get('time') ?? ''
  const passengers = params.get('passengers') ?? '2'
  const tripType = params.get('tripType') ?? 'oneway'
  const returnDate = params.get('returnDate') ?? ''
  const returnTime = params.get('returnTime') ?? ''
  const returnPickup = params.get('returnPickup') ?? ''

  useEffect(() => {
    supabase.from('locations').select('id,name').eq('is_active', true).order('name')
      .then(({ data }: any) => { if (data) setLocations(data); setLoading(false) })
  }, [])

  const pickupName  = locations.find(l => l.id === pickup)?.name ?? pickup
  const dropoffName = locations.find(l => l.id === dropoff)?.name ?? dropoff
  const dt = date ? new Date(`${date}T${time}`) : null
  const dateStr = dt ? dt.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : ''

  const quoteParams = new URLSearchParams({ pickup, dropoff, date, time, passengers, tripType,
    ...(tripType==='return' ? { returnDate, returnTime, returnPickup } : {}) })

  const cardStyle = { backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px' }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'520px', margin:'0 auto', padding:'48px 20px'}}>
        {loading ? (
          <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
        ) : (
          <>
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'28px'}}>
              <div style={{width:'32px', height:'32px', borderRadius:'50%', backgroundColor:'rgba(29,158,117,0.15)', border:'1.5px solid #1D9E75', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0}}>✓</div>
              <p style={{fontSize:'11px', letterSpacing:'0.15em', color:'#1D9E75', textTransform:'uppercase', margin:0}}>Trip details confirmed</p>
            </div>

            <div style={{...cardStyle, padding:'24px', marginBottom:'16px'}}>
              <p style={{fontSize:'11px', letterSpacing:'0.15em', color:'#f4b942', textTransform:'uppercase', marginBottom:'16px'}}>Your trip</p>
              {[
                { label:'From', value: pickupName||'—' },
                { label:'To', value: dropoffName||'—' },
                { label:'Date', value: dateStr||'—' },
                { label:'Time', value: time||'—' },
                { label:'Passengers', value: passengers },
                { label:'Trip type', value: tripType==='return'?'Return':'One way' },
                ...(tripType==='return'&&returnDate?[
                  { label:'Return date', value: new Date(`${returnDate}T${returnTime}`).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'}) },
                  { label:'Return time', value: returnTime },
                ]:[]),
              ].map((row, i, arr) => (
                <div key={row.label} style={{display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom:i<arr.length-1?'1px solid rgba(255,255,255,0.06)':'none'}}>
                  <span style={{fontSize:'13px', color:'rgba(255,255,255,0.4)'}}>{row.label}</span>
                  <span style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', textAlign:'right', maxWidth:'60%'}}>{row.value}</span>
                </div>
              ))}
            </div>

            <div style={{...cardStyle, padding:'28px', textAlign:'center', marginBottom:'16px'}}>
              <p style={{fontSize:'16px', fontWeight:'500', color:'#ffffff', marginBottom:'8px', lineHeight:'1.5'}}>
                Want to request quotes from transfer providers?
              </p>
              <p style={{fontSize:'13px', color:'rgba(255,255,255,0.45)', marginBottom:'24px', lineHeight:'1.6'}}>
                Providers will respond with their best price. No obligation until you accept an offer. Payment directly to driver on transfer day.
              </p>
              <div style={{display:'flex', gap:'12px', justifyContent:'center'}}>
                <button onClick={() => router.push(`/quote/?${quoteParams.toString()}`)} style={{
                  flex:1, maxWidth:'200px', padding:'14px', backgroundColor:'#f4b942', color:'#0f1419',
                  border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:'700',
                  letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer',
                }}>Yes, request quotes →</button>
                <button onClick={() => router.push('/')} style={{
                  padding:'14px 20px', backgroundColor:'transparent', color:'rgba(255,255,255,0.4)',
                  border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', fontSize:'14px', cursor:'pointer', fontFamily:'inherit',
                }}>No, go back</button>
              </div>
            </div>
            <p style={{fontSize:'12px', color:'rgba(255,255,255,0.25)', textAlign:'center', lineHeight:'1.6'}}>
              Prices are set by providers. Payment is made directly to your driver on transfer day.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#0f1419'}} />}><SearchContent /></Suspense>
}
