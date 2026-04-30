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

  // Read params from URL
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
    async function load() {
      const { data } = await supabase.from('locations').select('id,name').eq('is_active', true).order('name')
      if (data) setLocations(data)
      setLoading(false)
    }
    load()
  }, [])

  const pickupName = locations.find(l => l.id === pickup)?.name ?? pickup
  const dropoffName = locations.find(l => l.id === dropoff)?.name ?? dropoff

  const dt = date ? new Date(`${date}T${time}`) : null
  const dateStr = dt ? dt.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : ''
  const timeStr = time

  // Build quote URL with all params pre-filled
  const quoteParams = new URLSearchParams({
    pickup, dropoff, date, time, passengers, tripType,
    ...(tripType === 'return' ? { returnDate, returnTime, returnPickup } : {})
  })

  function handleYes() {
    router.push(`/quote/?${quoteParams.toString()}`)
  }

  function handleNo() {
    router.push('/')
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav lang={lang} onLangChange={setLang} />

      <div style={{maxWidth:'560px', margin:'0 auto', padding:'48px 20px'}}>
        {loading ? (
          <div style={{textAlign:'center', padding:'60px', color:'#8a8680'}}>Loading...</div>
        ) : (
          <>
            {/* Valid trip indicator */}
            <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'28px'}}>
              <div style={{width:'32px', height:'32px', borderRadius:'50%', backgroundColor:'rgba(29,158,117,0.15)', border:'1.5px solid #1D9E75', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', flexShrink:0}}>
                ✓
              </div>
              <div>
                <p style={{fontSize:'11px', letterSpacing:'0.15em', color:'#1D9E75', textTransform:'uppercase', margin:0}}>Trip details confirmed</p>
              </div>
            </div>

            {/* Trip summary card */}
            <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'10px', padding:'24px', marginBottom:'24px'}}>
              <p style={{fontSize:'11px', letterSpacing:'0.15em', color:'#e0a528', textTransform:'uppercase', marginBottom:'16px'}}>Your trip</p>

              <div style={{display:'flex', flexDirection:'column', gap:'0'}}>
                {[
                  { label:'From', value: pickupName || '—' },
                  { label:'To', value: dropoffName || '—' },
                  { label:'Date', value: dateStr || '—' },
                  { label:'Time', value: timeStr || '—' },
                  { label:'Passengers', value: passengers },
                  { label:'Trip type', value: tripType === 'return' ? 'Return' : 'One way' },
                  ...(tripType === 'return' && returnDate ? [
                    { label:'Return date', value: new Date(`${returnDate}T${returnTime}`).toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'}) },
                    { label:'Return time', value: returnTime },
                  ] : []),
                ].map((row, i, arr) => (
                  <div key={row.label} style={{display:'flex', justifyContent:'space-between', padding:'11px 0', borderBottom: i < arr.length-1 ? '1px solid #f5f2ea' : 'none'}}>
                    <span style={{fontSize:'13px', color:'#8a8680'}}>{row.label}</span>
                    <span style={{fontSize:'13px', fontWeight:'500', color:'#0f1419', textAlign:'right', maxWidth:'60%'}}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* The key question */}
            <div style={{backgroundColor:'#0f1419', borderRadius:'10px', padding:'28px', marginBottom:'16px', textAlign:'center'}}>
              <p style={{fontSize:'16px', fontWeight:'500', color:'#ffffff', marginBottom:'8px', lineHeight:'1.5'}}>
                Want to request quotes from transfer providers?
              </p>
              <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'24px', lineHeight:'1.6'}}>
                Providers will respond with their best price. No obligation until you accept an offer.
              </p>
              <div style={{display:'flex', gap:'12px', justifyContent:'center'}}>
                <button onClick={handleYes} style={{
                  flex:1, maxWidth:'200px', padding:'14px', backgroundColor:'#f4b942', color:'#0f1419',
                  border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:'700',
                  letterSpacing:'0.06em', textTransform:'uppercase', cursor:'pointer',
                }}>
                  Yes, request quotes →
                </button>
                <button onClick={handleNo} style={{
                  padding:'14px 20px', backgroundColor:'transparent', color:'rgba(255,255,255,0.5)',
                  border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', fontSize:'14px',
                  cursor:'pointer', fontFamily:'inherit',
                }}>
                  No, go back
                </button>
              </div>
            </div>

            <p style={{fontSize:'12px', color:'#8a8680', textAlign:'center', lineHeight:'1.6'}}>
              Prices are set by providers. Payment is made directly to your driver on the day of transfer.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}} />}>
      <SearchContent />
    </Suspense>
  )
}
