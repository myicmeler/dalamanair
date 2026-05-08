'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

export default function MyBookings() {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin/?redirect=/bookings/'); return }
      const { data } = await supabase.from('bookings')
        .select(`*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name),
          provider:providers(company_name,phone), vehicle:vehicles(make,model,seats), driver:drivers(name,phone)`)
        .eq('customer_id', user.id).order('pickup_time', { ascending: false })
      if (data) setBookings(data)
      setLoading(false)
    }
    load()
  }, [])

  const statusMap: Record<string,{bg:string,color:string,label:string}> = {
    pending:         {bg:'rgba(244,185,66,0.12)', color:'#f4b942', label:'Pending'},
    confirmed:       {bg:'rgba(29,158,117,0.12)', color:'#1D9E75', label:'Confirmed'},
    driver_assigned: {bg:'rgba(55,138,221,0.12)', color:'#378ADD', label:'Driver assigned'},
    completed:       {bg:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', label:'Completed'},
    cancelled:       {bg:'rgba(162,45,45,0.12)',   color:'#f09595', label:'Cancelled'},
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <style>{`* { box-sizing: border-box; }`}</style>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'680px', margin:'0 auto', padding:'24px 16px 48px'}}>
        <div style={{marginBottom:'20px'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'6px'}}>Your trips</p>
          <h1 style={{fontSize:'clamp(22px,5vw,26px)', fontWeight:'500', color:'#ffffff'}}>My bookings</h1>
        </div>
        {loading ? (
          <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
        ) : bookings.length === 0 ? (
          <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'48px 24px', textAlign:'center'}}>
            <p style={{fontSize:'15px', color:'rgba(255,255,255,0.4)', marginBottom:'16px'}}>No bookings yet</p>
            <a href="/" style={{padding:'12px 24px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'13px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>Search transfers →</a>
          </div>
        ) : bookings.map((b:any) => {
          const s = statusMap[b.status] ?? statusMap.pending
          const dt = new Date(b.pickup_time)
          const isPast = dt < new Date()
          return (
            <div key={b.id} style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden', marginBottom:'14px'}}>
              <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'6px'}}>
                  <div style={{fontSize:'15px', fontWeight:'500', color:'#ffffff', lineHeight:'1.3'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:s.bg, color:s.color, fontWeight:'500', flexShrink:0}}>{s.label}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                    {dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} · {dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · {b.passengers} pax
                    {b.flight_number&&` · ✈ ${b.flight_number}`}
                  </div>
                  <span style={{fontSize:'16px', fontWeight:'500', color:'#f4b942', flexShrink:0}}>€ {b.final_price?.toFixed(2)}</span>
                </div>
              </div>
              <div style={{padding:'12px 16px'}}>
                {b.provider&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Provider</div><div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff'}}>{b.provider.company_name}{b.provider.phone&&<span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginLeft:'8px'}}>📞 {b.provider.phone}</span>}</div></div>}
                {b.driver&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Driver</div><div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff'}}>{b.driver.name}{b.driver.phone&&<span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginLeft:'8px'}}>📞 {b.driver.phone}</span>}</div></div>}
                {b.vehicle&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Vehicle</div><div style={{fontSize:'13px', color:'rgba(255,255,255,0.7)'}}>{b.vehicle.make} {b.vehicle.model} · {b.vehicle.seats} seats</div></div>}
                {!isPast && b.status!=='cancelled' && (
                  <div style={{marginTop:'8px', padding:'10px 14px', backgroundColor:'rgba(29,158,117,0.08)', border:'1px solid rgba(29,158,117,0.15)', borderRadius:'6px', fontSize:'12px', color:'#1D9E75'}}>
                    💵 Pay your driver directly on the day — cash or card
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
