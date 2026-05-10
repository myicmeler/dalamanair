'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

export default function ProviderBookings() {
  const router = useRouter()
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string|null>(null)
  const [provider, setProvider] = useState<any>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin/?redirect=/provider/bookings/'); return }
    const { data: prov } = await supabase.from('providers').select('*').eq('user_id', user.id).single()
    if (!prov) { router.push('/'); return }
    setProvider(prov)
    const [{ data: bks }, { data: drv }] = await Promise.all([
      supabase.from('bookings').select(`*, customer:users!customer_id(full_name,email,phone), pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), vehicle:vehicles(make,model,seats), driver:drivers(name,phone)`).eq('provider_id', prov.id).order('pickup_time', { ascending: false }),
      supabase.from('drivers').select('*').eq('provider_id', prov.id).eq('is_active', true)
    ])
    if (bks) setBookings(bks)
    if (drv) setDrivers(drv)
    setLoading(false)
  }

  async function confirmBooking(booking: any) {
    setProcessing(booking.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('bookings').update({ status: 'pending_customer_acknowledgement' }).eq('id', booking.id)
      await supabase.from('booking_status_history').insert({
        booking_id: booking.id, status: 'pending_customer_acknowledgement',
        changed_by: user?.id, changed_by_role: 'provider',
        note: 'Provider confirmed — awaiting customer acknowledgement'
      })
      await supabase.from('user_notifications').insert({
        user_id: booking.customer_id,
        type: 'booking_provider_confirmed',
        title: 'Provider confirmed your booking',
        body: `${provider.company_name} confirmed. Please acknowledge to fully confirm.`,
        link: '/bookings/'
      })
      await load()
    } catch (err) { console.error(err) }
    setProcessing(null)
  }

  async function rejectBooking(booking: any) {
    if (!confirm('Reject this booking? The customer will be notified.')) return
    setProcessing(booking.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('bookings').update({ status: 'rejected_by_provider' }).eq('id', booking.id)
      await supabase.from('booking_status_history').insert({
        booking_id: booking.id, status: 'rejected_by_provider',
        changed_by: user?.id, changed_by_role: 'provider',
        note: 'Provider could not fulfil this booking'
      })
      await supabase.from('user_notifications').insert({
        user_id: booking.customer_id,
        type: 'booking_rejected',
        title: 'Provider declined booking',
        body: `${provider.company_name} could not fulfil ${booking.pickup?.name} → ${booking.dropoff?.name}. Please contact us.`,
        link: '/bookings/'
      })
      await load()
    } catch (err) { console.error(err) }
    setProcessing(null)
  }

  async function assignDriver(booking: any, driverId: string) {
    setProcessing(booking.id)
    await supabase.from('bookings').update({ driver_id: driverId, status: 'driver_assigned' }).eq('id', booking.id)
    const { data: { user } } = await supabase.auth.getUser()
    const driver = drivers.find(d => d.id === driverId)
    await supabase.from('booking_status_history').insert({
      booking_id: booking.id, status: 'driver_assigned',
      changed_by: user?.id, changed_by_role: 'provider',
      note: `Driver assigned: ${driver?.name}`
    })
    await supabase.from('user_notifications').insert({
      user_id: booking.customer_id,
      type: 'driver_assigned',
      title: 'Driver assigned to your transfer',
      body: `${driver?.name} will be your driver. Phone: ${driver?.phone}`,
      link: '/bookings/'
    })
    await load()
    setProcessing(null)
  }

  const statusMap: Record<string,{bg:string,color:string,label:string}> = {
    pending_provider_confirmation:    {bg:'rgba(244,185,66,0.12)', color:'#f4b942', label:'Action needed'},
    pending_customer_acknowledgement: {bg:'rgba(55,138,221,0.12)', color:'#378ADD', label:'Awaiting customer'},
    confirmed:                        {bg:'rgba(29,158,117,0.12)', color:'#1D9E75', label:'Confirmed'},
    driver_assigned:                  {bg:'rgba(55,138,221,0.12)', color:'#378ADD', label:'Driver assigned'},
    completed:                        {bg:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.4)', label:'Completed'},
    cancelled:                        {bg:'rgba(162,45,45,0.12)',   color:'#f09595', label:'Cancelled'},
    rejected_by_provider:             {bg:'rgba(162,45,45,0.12)',   color:'#f09595', label:'Rejected'},
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <style>{`* { box-sizing: border-box; }`}</style>
      <Nav />
      <div style={{maxWidth:'820px', margin:'0 auto', padding:'24px 16px 48px'}}>
        <div style={{marginBottom:'20px'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'6px'}}>Bookings</p>
          <h1 style={{fontSize:'clamp(22px,5vw,26px)', fontWeight:'500', color:'#ffffff'}}>Booking management</h1>
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
        ) : bookings.length === 0 ? (
          <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'48px 24px', textAlign:'center'}}>
            <p style={{fontSize:'15px', color:'rgba(255,255,255,0.4)'}}>No bookings yet</p>
          </div>
        ) : bookings.map((b:any) => {
          const s = statusMap[b.status] ?? statusMap.pending_provider_confirmation
          const dt = new Date(b.pickup_time)
          const needsConfirm = b.status === 'pending_provider_confirmation'
          const canAssign = b.status === 'confirmed' && !b.driver_id
          
          return (
            <div key={b.id} style={{backgroundColor:'#1a1f26', border:needsConfirm?'1px solid #f4b942':'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden', marginBottom:'14px'}}>
              <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'6px'}}>
                  <div style={{fontSize:'15px', fontWeight:'500', color:'#ffffff', lineHeight:'1.3'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:s.bg, color:s.color, fontWeight:'500', flexShrink:0}}>{s.label}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px'}}>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                    {dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} · {dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · {b.passengers} pax{b.flight_number&&` · ✈ ${b.flight_number}`}
                  </div>
                  <span style={{fontSize:'16px', fontWeight:'500', color:'#f4b942'}}>€ {b.final_price?.toFixed(2)}</span>
                </div>
              </div>
              <div style={{padding:'12px 16px'}}>
                {b.customer&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Customer</div><div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff'}}>{b.customer.full_name}{b.customer.phone&&<span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginLeft:'8px'}}>📞 {b.customer.phone}</span>}</div><div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{b.customer.email}</div></div>}
                {b.vehicle&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Vehicle</div><div style={{fontSize:'13px', color:'rgba(255,255,255,0.7)'}}>{b.vehicle.make} {b.vehicle.model} · {b.vehicle.seats} seats</div></div>}
                {b.driver&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Driver</div><div style={{fontSize:'13px', color:'rgba(255,255,255,0.7)'}}>{b.driver.name}</div></div>}
                {b.customer_notes&&<div style={{marginBottom:'8px', padding:'8px 12px', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'6px', fontSize:'12px', color:'rgba(255,255,255,0.6)', fontStyle:'italic'}}>"{b.customer_notes}"</div>}

                {needsConfirm && (
                  <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                    <button onClick={() => confirmBooking(b)} disabled={processing===b.id}
                      style={{flex:1, padding:'12px', backgroundColor:'#1D9E75', color:'#ffffff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase'}}>
                      {processing===b.id ? 'Processing...' : '✓ Confirm booking'}
                    </button>
                    <button onClick={() => rejectBooking(b)} disabled={processing===b.id}
                      style={{padding:'12px 18px', background:'none', border:'1px solid rgba(162,45,45,0.5)', borderRadius:'6px', color:'#f09595', fontSize:'13px', cursor:'pointer', fontFamily:'inherit'}}>
                      Reject
                    </button>
                  </div>
                )}

                {canAssign && drivers.length > 0 && (
                  <div style={{marginTop:'12px'}}>
                    <label style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px', letterSpacing:'0.05em', textTransform:'uppercase'}}>Assign driver</label>
                    <select onChange={e => { if (e.target.value) assignDriver(b, e.target.value) }} disabled={processing===b.id}
                      style={{width:'100%', fontSize:'14px', padding:'10px', backgroundColor:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#ffffff', fontFamily:'inherit'}}>
                      <option value="">Select a driver...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
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
