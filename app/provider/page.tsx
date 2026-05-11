'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ProviderDashboard() {
  const router = useRouter()
  const supabase = createClient() as any
  const [loading, setLoading] = useState(true)
  const [providerName, setProviderName] = useState('')
  const [stats, setStats] = useState({
    newRequests: 0,           // open quote requests provider hasn't offered on, future pickup
    needsConfirmation: 0,     // bookings pending_provider_confirmation, future pickup
    awaitingCustomer: 0,      // bookings pending_customer_acknowledgement, future pickup
  })
  const [upcomingTrips, setUpcomingTrips] = useState<any[]>([])

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin?redirect=/provider'); return }
    const { data: provider } = await supabase.from('providers').select('id, company_name').eq('user_id', user.id).single()
    if (!provider) { router.push('/'); return }
    setProviderName(provider.company_name)

    const nowIso = new Date().toISOString()
    const fiveDaysFromNow = new Date(); fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5)

    // Stat 1: Open quote requests (future pickup) provider hasn't offered on
    const { data: openRequests } = await supabase
      .from('quote_requests').select('id, pickup_time')
      .eq('status', 'open')
      .gt('pickup_time', nowIso)
    let newRequestsCount = 0
    if (openRequests && openRequests.length > 0) {
      const { data: myOffers } = await supabase
        .from('quote_offers').select('request_id')
        .eq('provider_id', provider.id)
        .in('request_id', openRequests.map((r:any) => r.id))
      const offeredIds = new Set((myOffers ?? []).map((o:any) => o.request_id))
      newRequestsCount = openRequests.filter((r:any) => !offeredIds.has(r.id)).length
    }

    // Pull all this provider's bookings to calculate stats and upcoming trips
    const { data: allBookings } = await supabase
      .from('bookings')
      .select(`*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), driver:drivers(full_name)`)
      .eq('provider_id', provider.id)
      .gt('pickup_time', nowIso)
      .order('pickup_time', { ascending: true })

    // Stats based on future pickups only
    const needsConfirmation = (allBookings ?? []).filter((b:any) => b.status === 'pending_provider_confirmation').length
    const awaitingCustomer  = (allBookings ?? []).filter((b:any) => b.status === 'pending_customer_acknowledgement').length

    // Upcoming trips: next 5 days, exclude cancelled/rejected
    const upcoming = (allBookings ?? []).filter((b:any) => {
      const dt = new Date(b.pickup_time)
      return dt <= fiveDaysFromNow && !['cancelled','rejected_by_provider'].includes(b.status)
    })

    setStats({ newRequests: newRequestsCount, needsConfirmation, awaitingCustomer })
    setUpcomingTrips(upcoming)
    setLoading(false)
  }

  const statusLabels: Record<string,string> = {
    pending_provider_confirmation:    'Needs your confirmation',
    pending_customer_acknowledgement: 'Awaiting customer',
    confirmed:                        'Confirmed',
    driver_assigned:                  'Driver assigned',
  }
  const statusColors: Record<string,string> = {
    pending_provider_confirmation:    '#f4b942',
    pending_customer_acknowledgement: '#378ADD',
    confirmed:                        '#1D9E75',
    driver_assigned:                  '#1D9E75',
  }

  if (loading) return (
    <div style={{padding:'60px 20px', textAlign:'center', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
  )

  const totalActions = stats.newRequests + stats.needsConfirmation
  const today = new Date().toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div style={{padding:'20px 16px 80px', maxWidth:'820px', margin:'0 auto'}}>
      <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginBottom:'4px'}}>{today}</p>
      <h1 style={{fontSize:'24px', fontWeight:'500', marginBottom:'4px', color:'#ffffff'}}>Welcome back{providerName?`, ${providerName}`:''}</h1>
      <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'24px'}}>
        {totalActions > 0 ? `You have ${totalActions} item${totalActions>1?'s':''} that need attention` : 'All caught up — no actions pending'}
      </p>

      {/* Action stats */}
      <h2 style={{fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'12px'}}>Pending actions</h2>
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'24px'}}>
        <Link href="/provider/quotes" style={{textDecoration:'none'}}>
          <div style={{backgroundColor:stats.newRequests>0?'rgba(244,185,66,0.08)':'rgba(255,255,255,0.04)', border:stats.newRequests>0?'1px solid rgba(244,185,66,0.3)':'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px 14px'}}>
            <div style={{fontSize:'26px', fontWeight:'600', color:stats.newRequests>0?'#f4b942':'rgba(255,255,255,0.6)', marginBottom:'6px'}}>{stats.newRequests}</div>
            <div style={{fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:'1.4'}}>New quote requests</div>
          </div>
        </Link>

        <Link href="/provider/bookings" style={{textDecoration:'none'}}>
          <div style={{backgroundColor:stats.needsConfirmation>0?'rgba(244,185,66,0.08)':'rgba(255,255,255,0.04)', border:stats.needsConfirmation>0?'1px solid rgba(244,185,66,0.3)':'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px 14px'}}>
            <div style={{fontSize:'26px', fontWeight:'600', color:stats.needsConfirmation>0?'#f4b942':'rgba(255,255,255,0.6)', marginBottom:'6px'}}>{stats.needsConfirmation}</div>
            <div style={{fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:'1.4'}}>Need your confirmation</div>
          </div>
        </Link>

        <Link href="/provider/bookings" style={{textDecoration:'none'}}>
          <div style={{backgroundColor:stats.awaitingCustomer>0?'rgba(55,138,221,0.08)':'rgba(255,255,255,0.04)', border:stats.awaitingCustomer>0?'1px solid rgba(55,138,221,0.3)':'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px 14px'}}>
            <div style={{fontSize:'26px', fontWeight:'600', color:stats.awaitingCustomer>0?'#378ADD':'rgba(255,255,255,0.6)', marginBottom:'6px'}}>{stats.awaitingCustomer}</div>
            <div style={{fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:'1.4'}}>Awaiting customer</div>
          </div>
        </Link>
      </div>

      {/* Upcoming trips */}
      <h2 style={{fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'12px'}}>Upcoming next 5 days</h2>
      {upcomingTrips.length === 0 ? (
        <div style={{textAlign:'center', padding:'40px 20px', color:'rgba(255,255,255,0.3)', fontSize:'14px', backgroundColor:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:'8px'}}>
          No trips scheduled in the next 5 days
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {upcomingTrips.map((b:any) => {
            const dt = new Date(b.pickup_time)
            const isToday = dt.toDateString() === new Date().toDateString()
            const isTomorrow = dt.toDateString() === new Date(Date.now() + 86400000).toDateString()
            const dayLabel = isToday ? 'Today' : isTomorrow ? 'Tomorrow' : dt.toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'})
            const statusColor = statusColors[b.status] ?? 'rgba(255,255,255,0.4)'
            const statusLabel = statusLabels[b.status] ?? b.status
            return (
              <Link key={b.id} href="/provider/bookings" style={{textDecoration:'none'}}>
                <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px 16px'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px'}}>
                    <div style={{flex:1, minWidth:0}}>
                      <div style={{fontSize:'14px', fontWeight:'500', color:'#ffffff', marginBottom:'2px'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)'}}>
                        <span style={{color:isToday?'#f4b942':'rgba(255,255,255,0.7)', fontWeight:isToday?'500':'400'}}>{dayLabel}</span> · {dt.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · {b.passengers} pax{b.flight_number&&` · ✈ ${b.flight_number}`}
                      </div>
                      {b.driver?.full_name && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'4px'}}>Driver: {b.driver.full_name}</div>}
                    </div>
                    <div style={{textAlign:'right', flexShrink:0}}>
                      <div style={{fontSize:'15px', fontWeight:'500', color:'#f4b942', marginBottom:'4px'}}>€ {b.final_price?.toFixed(2)}</div>
                      <div style={{fontSize:'10px', color:statusColor, letterSpacing:'0.05em'}}>{statusLabel}</div>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
