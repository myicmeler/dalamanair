'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { callFunction } from '@/lib/functions'

// Currency symbol from the booking's own currency (backfilled from the linked quote).
// Falls back to € for anything that isn't GBP.
const sym = (c?: string) => (c === 'GBP' ? '£' : '€')

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
    if (!user) { router.push('/auth/signin?redirect=/provider/bookings'); return }
    const { data: prov } = await supabase.from('providers').select('*').eq('user_id', user.id).single()
    if (!prov) { router.push('/'); return }
    setProvider(prov)
    const [{ data: bks }, { data: drv }] = await Promise.all([
      supabase.from('bookings')
        .select(`*, customer:users!customer_id(full_name,email,phone), pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), vehicle:vehicles(make,model,seats), driver:drivers(full_name,phone)`)
        .eq('provider_id', prov.id)
        .order('pickup_time', { ascending: false }),
      supabase.from('drivers').select('*').eq('provider_id', prov.id).eq('is_active', true)
    ])
    if (bks) setBookings(bks)
    if (drv) setDrivers(drv)
    setLoading(false)
  }

  // Provider confirmation now confirms the booking outright. The old
  // 'pending_customer_acknowledgement' step was removed on 9 Aug 2026: it
  // required the customer to click acknowledge, which they learned about only
  // by email, and this platform's customers do not read email. Bookings simply
  // sat unconfirmed while the provider was already holding the slot.
  async function confirmBooking(booking: any) {
    setProcessing(booking.id)
    try {
      // History row written automatically by trg_log_booking_status_change.
      const { error: confirmError } = await supabase.from('bookings')
        .update({ status: 'confirmed' })
        .eq('id', booking.id)
      if (confirmError) {
        console.error('CONFIRM BOOKING FAILED:', confirmError)
        alert('Could not confirm the booking. Please try again.')
        return
      }
      const { error: notifyError } = await supabase.from('user_notifications').insert({
        user_id: booking.customer_id, type: 'booking_provider_confirmed',
        title: 'Your booking is confirmed',
        body: `${provider.company_name} confirmed your transfer. Nothing further is needed from you.`,
        link: '/bookings/'
      })
      if (notifyError) console.error('CONFIRM NOTIFICATION FAILED:', notifyError)
      try {
        await callFunction('send-email', {
          type: 'booking_confirmed_customer', customerId: booking.customer_id,
          data: {
            pickup: booking.pickup?.name, dropoff: booking.dropoff?.name,
            // timeZone:'UTC' — send the time exactly as it was entered, no conversion
            date: new Date(booking.pickup_time).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}),
            time: new Date(booking.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}),
            providerName: provider.company_name, price: booking.final_price?.toFixed(2),
            // currency was missing here, so GBP bookings rendered € in the email.
            currency: booking.currency ?? 'EUR',
            flightNumber: booking.flight_number,
          }
        })
      } catch (e) { console.error(e) }
      // Best-effort SMS (dormant until NEXT_PUBLIC_SMS_ENABLED=true and send-sms is deployed with Plivo creds).
      if (process.env.NEXT_PUBLIC_SMS_ENABLED === 'true') {
        try {
          await callFunction('send-sms', {
            type: 'booking_confirmed_customer', bookingId: booking.id, customerId: booking.customer_id,
            data: {
              route: `${booking.pickup?.name} -> ${booking.dropoff?.name}`,
              date: new Date(booking.pickup_time).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}),
              time: new Date(booking.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}),
              providerName: provider.company_name,
            }
          })
        } catch (e) { console.error('booking-confirmed sms error:', e) }
      }
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  async function rejectBooking(booking: any) {
    if (!confirm('Reject this booking? The customer will be notified.')) return
    setProcessing(booking.id)
    try {
      // History row written automatically by trg_log_booking_status_change.
      const { error: rejectError } = await supabase.from('bookings')
        .update({ status: 'rejected_by_provider' })
        .eq('id', booking.id)
      if (rejectError) {
        console.error('REJECT BOOKING FAILED:', rejectError)
        alert('Could not reject the booking. Please try again.')
        return
      }
      const { error: notifyError } = await supabase.from('user_notifications').insert({
        user_id: booking.customer_id, type: 'booking_rejected',
        title: 'Provider declined booking',
        body: `${provider.company_name} could not fulfil ${booking.pickup?.name} → ${booking.dropoff?.name}.`,
        link: '/bookings/'
      })
      if (notifyError) console.error('REJECT NOTIFICATION FAILED:', notifyError)
      await load()
    } catch (err) {
      console.error(err)
    } finally {
      setProcessing(null)
    }
  }

  async function assignDriver(booking: any, driverId: string) {
    setProcessing(booking.id)
    try {
      const driver = drivers.find(d => d.id === driverId)
      // History row written automatically by trg_log_booking_status_change.
      // The driver's identity is recoverable from bookings.driver_id.
      const { error: assignError } = await supabase.from('bookings')
        .update({ driver_id: driverId, status: 'driver_assigned' })
        .eq('id', booking.id)
      if (assignError) {
        console.error('ASSIGN DRIVER FAILED:', assignError)
        alert('Could not assign the driver. Please try again.')
        return
      }
      const { error: notifyError } = await supabase.from('user_notifications').insert({
        user_id: booking.customer_id, type: 'driver_assigned',
        title: 'Driver assigned to your transfer',
        body: `${driver?.full_name} will be your driver. Phone: ${driver?.phone}`,
        link: '/bookings/'
      })
      // Non-fatal: the driver is assigned either way, so do not block on this.
      if (notifyError) console.error('DRIVER ASSIGNED NOTIFICATION FAILED:', notifyError)
      // Email the customer (best-effort — the assignment is already committed).
      try {
        await callFunction('send-email', {
          type: 'driver_assigned', customerId: booking.customer_id,
          data: {
            pickup: booking.pickup?.name, dropoff: booking.dropoff?.name,
            date: new Date(booking.pickup_time).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}),
            time: new Date(booking.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}),
            driverName: driver?.full_name, driverPhone: driver?.phone,
            providerName: provider?.company_name,
            vehicle: booking.vehicle ? `${booking.vehicle.make} ${booking.vehicle.model}` : null,
            price: booking.final_price?.toFixed(2), currency: booking.currency ?? 'EUR',
          }
        })
      } catch (e) { console.error('driver-assigned email error:', e) }
      // Best-effort SMS (dormant until NEXT_PUBLIC_SMS_ENABLED=true and send-sms is deployed with Plivo creds).
      if (process.env.NEXT_PUBLIC_SMS_ENABLED === 'true') {
        try {
          await callFunction('send-sms', {
            type: 'driver_assigned', bookingId: booking.id, customerId: booking.customer_id,
            data: {
              route: `${booking.pickup?.name} -> ${booking.dropoff?.name}`,
              date: new Date(booking.pickup_time).toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'}),
              time: new Date(booking.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}),
              driverName: driver?.full_name, driverPhone: driver?.phone,
            }
          })
        } catch (e) { console.error('driver-assigned sms error:', e) }
      }
      await load()
    } catch (err) {
      console.error('assignDriver error:', err)
      alert('Something went wrong assigning the driver. Please try again.')
    } finally {
      setProcessing(null)
    }
  }

  // 'pending_customer_acknowledgement' is retained here only so historical
  // bookings created before 9 Aug 2026 still render a sensible label. Nothing
  // puts a booking into that state any more.
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
    <div style={{padding:'20px 16px 80px', maxWidth:'820px', margin:'0 auto'}}>
      <div style={{marginBottom:'20px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'6px'}}>Bookings</p>
        <h1 style={{fontSize:'clamp(20px,5vw,24px)', fontWeight:'500', color:'#ffffff'}}>Booking management</h1>
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
        // pending_customer_acknowledgement kept for pre-9-Aug bookings only.
        const canAssign = (b.status === 'confirmed' || b.status === 'pending_customer_acknowledgement') && !b.driver_id
        // Manually-logged transfers have no platform customer — customer_id points
        // at the provider — so the real customer lives in manual_customer_* fields.
        const isManual = b.source === 'manual'
        const custName = isManual ? (b.manual_customer_name || '—') : (b.customer?.full_name || '—')
        const custEmail = isManual ? b.manual_customer_email : b.customer?.email
        const custPhone = isManual
          ? (b.manual_customer_phone || b.customer_phone)
          : (b.customer_phone || b.customer?.phone)   // trip phone first, then account phone

        return (
          <div key={b.id} style={{backgroundColor:'#1a1f26', border:needsConfirm?'1px solid #f4b942':'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden', marginBottom:'14px'}}>
            <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'6px'}}>
                <div style={{fontSize:'15px', fontWeight:'500', color:'#ffffff', lineHeight:'1.3'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
                <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:s.bg, color:s.color, fontWeight:'500', flexShrink:0}}>{s.label}</span>
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'8px'}}>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {/* timeZone:'UTC' on both — show the time exactly as entered, same on every device */}
                  {dt.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})} · {dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})} · {b.passengers} pax{b.flight_number&&` · ✈ ${b.flight_number}`}
                </div>
                <span style={{fontSize:'16px', fontWeight:'500', color:'#f4b942'}}>{sym(b.currency)} {b.final_price?.toFixed(2)}</span>
              </div>
            </div>
            <div style={{padding:'12px 16px'}}>
              <div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Customer{isManual?' · logged':''}</div><div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff'}}>{custName}</div>{custEmail&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{custEmail}</div>}{custPhone&&<div style={{marginTop:'6px'}}><a href={`tel:${custPhone}`} style={{fontSize:'15px', fontWeight:'700', color:'#ff4d4d', textDecoration:'none', letterSpacing:'0.02em'}}>📞 {custPhone}</a></div>}</div>
              {b.vehicle&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Vehicle</div><div style={{fontSize:'13px', color:'rgba(255,255,255,0.7)'}}>{b.vehicle.make} {b.vehicle.model} · {b.vehicle.seats} seats</div></div>}
              {b.driver&&<div style={{marginBottom:'8px'}}><div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>Driver</div><div style={{fontSize:'13px', color:'rgba(255,255,255,0.7)'}}>{b.driver.full_name}</div></div>}
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
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
