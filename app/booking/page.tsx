'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

function BookingContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient() as any
  const [lang] = useState<'en'|'tr'>('en')
  const [vehicle, setVehicle] = useState<any>(null)
  const [pickup, setPickup] = useState<any>(null)
  const [dropoff, setDropoff] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ firstName:'', lastName:'', email:'', phone:'', flightNumber:'', notes:'' })

  const vehicleId = params.get('vehicleId')??''
  const pickupId = params.get('pickup')??''
  const dropoffId = params.get('dropoff')??''
  const tripType = params.get('tripType')??'oneway'
  const price = parseFloat(params.get('price')??'0')
  const returnPrice = Math.round(price*0.9)
  const discount = tripType==='return' ? Math.round(price*0.1) : 0
  const total = tripType==='return' ? price+returnPrice : price

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: p }, { data: d }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('id', vehicleId).single(),
        supabase.from('locations').select('*').eq('id', pickupId).single(),
        supabase.from('locations').select('*').eq('id', dropoffId).single(),
      ])
      if (v) setVehicle(v)
      if (p) setPickup(p)
      if (d) setDropoff(d)
    }
    if (vehicleId) load()
  }, [vehicleId])

  async function handlePay() {
    if (!form.firstName || !form.email || !form.phone) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push(`/auth/signin?redirect=${encodeURIComponent(`/booking?${params.toString()}`)}`)
        return
      }
      const { data: booking, error } = await supabase.from('bookings').insert({
        customer_id:user.id, vehicle_id:vehicleId,
        pickup_location_id:pickupId, dropoff_location_id:dropoffId,
        direction:'outbound', pickup_time:`${params.get('date')}T${params.get('time')}:00`,
        passengers:parseInt(params.get('passengers')??'1'),
        luggage:0, status:'pending', price,
        discount_pct:tripType==='return'?10:0, final_price:price,
        flight_number:form.flightNumber||null, customer_notes:form.notes||null,
      }).select().single()
      if (error||!booking) throw error
      if (tripType==='return') {
        await supabase.from('bookings').insert({
          customer_id:user.id, vehicle_id:vehicleId,
          pickup_location_id:params.get('returnPickup')||dropoffId,
          dropoff_location_id:pickupId, direction:'inbound', group_id:booking.group_id,
          pickup_time:`${params.get('returnDate')}T${params.get('returnTime')}:00`,
          passengers:parseInt(params.get('passengers')??'1'),
          luggage:0, status:'pending', price:returnPrice, discount_pct:10, final_price:returnPrice,
        })
      }
      await supabase.from('payments').insert({ booking_id:booking.id, amount:total, currency:'EUR', status:'pending' })
      router.push(`/confirmation?bookingId=${booking.id}&ref=DMR-${new Date().getFullYear()}-${booking.id.slice(0,5).toUpperCase()}`)
    } catch (err) {
      console.error(err)
      setSubmitting(false)
    }
  }

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: any) => setForm(p => ({...p, [key]:e.target.value}))
  })

  const inputStyle = { width:'100%', fontSize:'15px', padding:'13px 12px', marginTop:'4px' }
  const labelStyle = { fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'#8a8680' }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav lang={lang} />
      <div style={{maxWidth:'600px', margin:'0 auto', padding:'20px 16px 40px'}}>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#0f1419', marginBottom:'20px'}}>Review & pay</h1>

        {/* Trip summary */}
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'16px', marginBottom:'12px'}}>
          <p style={{fontSize:'10px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'12px'}}>
            Outbound · {params.get('date')}
          </p>
          {[
            ['Route', `${pickup?.name??'...'} → ${dropoff?.name??'...'}`],
            ['Pick-up', params.get('time')],
            ['Vehicle', vehicle?`${vehicle.make} ${vehicle.model}`:'...'],
            ['Passengers', params.get('passengers')??'1'],
          ].map(([k,v]) => (
            <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f2ea'}}>
              <span style={{fontSize:'13px', color:'#8a8680'}}>{k}</span>
              <span style={{fontSize:'13px', color:'#0f1419', fontWeight:'500'}}>{v}</span>
            </div>
          ))}
        </div>

        {tripType==='return' && (
          <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'16px', marginBottom:'12px'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px'}}>
              <p style={{fontSize:'10px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase'}}>Return · {params.get('returnDate')}</p>
              <span style={{fontSize:'10px', backgroundColor:'rgba(244,185,66,0.15)', color:'#854F0B', padding:'3px 8px', borderRadius:'10px'}}>10% off</span>
            </div>
            {[
              ['Route', `${dropoff?.name??'...'} → ${pickup?.name??'...'}`],
              ['Pick-up', params.get('returnTime')],
            ].map(([k,v]) => (
              <div key={k} style={{display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid #f5f2ea'}}>
                <span style={{fontSize:'13px', color:'#8a8680'}}>{k}</span>
                <span style={{fontSize:'13px', color:'#0f1419', fontWeight:'500'}}>{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Price summary */}
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'16px', marginBottom:'12px'}}>
          <p style={{fontSize:'10px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'12px'}}>Price summary</p>
          <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}>
            <span style={{fontSize:'13px', color:'#8a8680'}}>Outbound</span>
            <span style={{fontSize:'13px', color:'#0f1419'}}>€ {price.toFixed(2)}</span>
          </div>
          {tripType==='return' && <>
            <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}>
              <span style={{fontSize:'13px', color:'#8a8680'}}>Return</span>
              <span style={{fontSize:'13px', color:'#0f1419'}}>€ {price.toFixed(2)}</span>
            </div>
            <div style={{display:'flex', justifyContent:'space-between', padding:'6px 0'}}>
              <span style={{fontSize:'13px', color:'#1D9E75'}}>T/R discount (10%)</span>
              <span style={{fontSize:'13px', color:'#1D9E75'}}>− € {discount.toFixed(2)}</span>
            </div>
          </>}
          <div style={{display:'flex', justifyContent:'space-between', padding:'12px 0 0', borderTop:'1px solid #e5e3dd', marginTop:'8px'}}>
            <span style={{fontSize:'16px', fontWeight:'500', color:'#0f1419'}}>Total</span>
            <span style={{fontSize:'20px', fontWeight:'500', color:'#0f1419'}}>€ {total.toFixed(2)}</span>
          </div>
        </div>

        {/* Your details */}
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'16px', marginBottom:'12px'}}>
          <p style={{fontSize:'10px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'16px'}}>Your details</p>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
            {[
              {label:'First name *', key:'firstName' as const, placeholder:'Tom', type:'text'},
              {label:'Last name *', key:'lastName' as const, placeholder:'Smith', type:'text'},
            ].map(field => (
              <div key={field.key}>
                <label style={labelStyle}>{field.label}</label>
                <input type={field.type} {...f(field.key)} placeholder={field.placeholder} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{marginTop:'12px'}}>
            <label style={labelStyle}>Email *</label>
            <input type="email" {...f('email')} placeholder="you@email.com" style={inputStyle} />
          </div>
          <div style={{marginTop:'12px'}}>
            <label style={labelStyle}>Phone *</label>
            <input type="tel" {...f('phone')} placeholder="+44 7700..." style={inputStyle} />
          </div>
          <div style={{marginTop:'12px'}}>
            <label style={labelStyle}>Flight number (optional)</label>
            <input type="text" {...f('flightNumber')} placeholder="TK 1234" style={inputStyle} />
          </div>
          <div style={{marginTop:'12px'}}>
            <label style={labelStyle}>Notes (optional)</label>
            <input type="text" {...f('notes')} placeholder="Child seat needed..." style={inputStyle} />
          </div>
        </div>

        {/* Payment */}
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <p style={{fontSize:'10px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'12px'}}>Payment</p>
          <div style={{padding:'13px 12px', border:'1px solid #e5e3dd', borderRadius:'4px', fontSize:'14px', color:'#8a8680', marginBottom:'8px'}}>Card number · · · · · · · ·</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
            <div style={{padding:'13px 12px', border:'1px solid #e5e3dd', borderRadius:'4px', fontSize:'14px', color:'#8a8680'}}>MM / YY</div>
            <div style={{padding:'13px 12px', border:'1px solid #e5e3dd', borderRadius:'4px', fontSize:'14px', color:'#8a8680'}}>CVC</div>
          </div>
        </div>

        <button onClick={handlePay} disabled={submitting||!form.firstName||!form.email||!form.phone} style={{
          width:'100%', backgroundColor: (!submitting&&form.firstName&&form.email&&form.phone) ? '#f4b942' : '#fad98a',
          color:'#0f1419', fontWeight:'600', fontSize:'14px', letterSpacing:'0.05em',
          textTransform:'uppercase', padding:'16px', borderRadius:'6px',
          border:'none', cursor:(!submitting&&form.firstName&&form.email&&form.phone)?'pointer':'not-allowed'
        }}>
          {submitting ? 'Processing...' : `Pay € ${total.toFixed(2)} →`}
        </button>
        <p style={{textAlign:'center', fontSize:'11px', color:'#8a8680', marginTop:'10px', letterSpacing:'0.05em'}}>SECURED BY STRIPE · SSL ENCRYPTED</p>

        <button onClick={() => router.back()} style={{display:'block', margin:'16px auto 0', fontSize:'13px', color:'#8a8680', background:'none', border:'none', cursor:'pointer'}}>
          ← Back to vehicles
        </button>
      </div>
    </div>
  )
}

export default function BookingPage() {
  return <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}/>}><BookingContent /></Suspense>
}
