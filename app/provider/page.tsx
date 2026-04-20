'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderDashboard() {
  const supabase = createClient() as any
  const [stats, setStats] = useState({ today:0, unassigned:0, rating:0, revenue:0 })
  const [bookings, setBookings] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [assigning, setAssigning] = useState<string|null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Record<string,string>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id, avg_rating').eq('user_id', user.id).single()
      if (!provider) return
      const today = new Date().toISOString().split('T')[0]
      const { data: bk } = await supabase
        .from('bookings')
        .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), driver:drivers(full_name, status), vehicle:vehicles(make, model)')
        .eq('provider_id', provider.id)
        .gte('pickup_time', today+'T00:00:00')
        .lte('pickup_time', today+'T23:59:59')
        .order('pickup_time')
      if (bk) {
        setBookings(bk)
        setStats({
          today: bk.length,
          unassigned: bk.filter((b:any) => !b.driver_id).length,
          rating: provider.avg_rating || 0,
          revenue: bk.reduce((s:number,b:any) => s+(b.final_price||0), 0),
        })
      }
      const { data: dr } = await supabase.from('drivers').select('*').eq('provider_id', provider.id).eq('is_active', true)
      if (dr) setDrivers(dr)
    }
    load()
  }, [])

  async function assignDriver(bookingId: string, driverId: string) {
    await supabase.from('bookings').update({ driver_id:driverId, status:'driver_assigned' }).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id===bookingId ? {...b, driver_id:driverId, status:'driver_assigned', driver:drivers.find(d=>d.id===driverId)} : b))
    setAssigning(null)
  }

  const statusColor: Record<string,string> = {
    pending:'#EF9F27', confirmed:'#1D9E75', driver_assigned:'#378ADD', completed:'#8a8680', cancelled:'#E24B4A'
  }

  return (
    <div style={{padding:'16px'}}>
      <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginBottom:'4px'}}>
        {new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'})}
      </p>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'16px'}}>Today</h1>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px'}}>
        {[
          {num:stats.today, label:'Trips today'},
          {num:stats.unassigned, label:'Unassigned'},
          {num:stats.rating.toFixed(1)+'★', label:'Avg rating'},
          {num:`€${stats.revenue.toFixed(0)}`, label:'Revenue'},
        ].map(s => (
          <div key={s.label} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
            <div style={{fontSize:'22px', fontWeight:'500', marginBottom:'3px'}}>{s.num}</div>
            <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <h2 style={{fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'12px'}}>Today&apos;s bookings</h2>

      {bookings.length === 0 ? (
        <div style={{textAlign:'center', padding:'40px 0', color:'rgba(255,255,255,0.3)', fontSize:'14px'}}>No bookings today</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {bookings.map((b:any) => (
            <div key={b.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                <div>
                  <div style={{fontSize:'18px', fontWeight:'500'}}>
                    {new Date(b.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}
                  </div>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginTop:'2px'}}>
                    {b.direction==='outbound'?'→ Outbound':'← Inbound'}
                  </div>
                </div>
                <span style={{fontSize:'10px', padding:'4px 8px', borderRadius:'10px', backgroundColor:`${statusColor[b.status]}20`, color:statusColor[b.status]}}>
                  {b.status?.replace('_',' ')}
                </span>
              </div>
              <div style={{fontSize:'13px', marginBottom:'6px'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'10px'}}>
                {b.passengers} pax · {b.vehicle?`${b.vehicle.make} ${b.vehicle.model}`:'No vehicle'}
              </div>
              {b.driver ? (
                <div style={{fontSize:'12px', color:'#1D9E75'}}>✓ {b.driver.full_name}</div>
              ) : assigning===b.id ? (
                <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                  <select value={selectedDriver[b.id]??''} onChange={e => setSelectedDriver(p => ({...p, [b.id]:e.target.value}))}
                    style={{flex:1, fontSize:'13px', padding:'8px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'#f0ede6'}}>
                    <option value="">Select driver</option>
                    {drivers.map((d:any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                  <button onClick={() => selectedDriver[b.id] && assignDriver(b.id, selectedDriver[b.id])}
                    style={{padding:'8px 14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'4px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>
                    Assign
                  </button>
                  <button onClick={() => setAssigning(null)} style={{padding:'8px', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer', fontSize:'16px'}}>✕</button>
                </div>
              ) : (
                <button onClick={() => setAssigning(b.id)} style={{width:'100%', padding:'10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#f0ede6', fontSize:'13px', cursor:'pointer'}}>
                  + Assign driver
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
