'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderBookings() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'unassigned'|'confirmed'|'completed'>('all')
  const [assigning, setAssigning] = useState<string|null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Record<string,string>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
      if (!provider) return
      const { data: bk } = await supabase
        .from('bookings')
        .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), driver:drivers(full_name), vehicle:vehicles(make,model)')
        .eq('provider_id', provider.id).order('pickup_time', {ascending:true})
      if (bk) setBookings(bk)
      const { data: dr } = await supabase.from('drivers').select('*').eq('provider_id', provider.id).eq('is_active', true)
      if (dr) setDrivers(dr)
      setLoading(false)
    }
    load()
  }, [])

  async function assignDriver(bookingId: string, driverId: string) {
    await supabase.from('bookings').update({ driver_id:driverId, status:'driver_assigned' }).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id===bookingId ? {...b, driver_id:driverId, status:'driver_assigned', driver:drivers.find(d=>d.id===driverId)} : b))
    setAssigning(null)
  }

  const filtered = bookings.filter(b => {
    if (filter==='unassigned') return !b.driver_id
    if (filter==='confirmed') return b.status==='confirmed'||b.status==='driver_assigned'
    if (filter==='completed') return b.status==='completed'
    return true
  })

  const statusColor: Record<string,string> = {
    pending:'#EF9F27', confirmed:'#1D9E75', driver_assigned:'#378ADD', completed:'#8a8680', cancelled:'#E24B4A'
  }

  return (
    <div style={{padding:'16px'}}>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'16px'}}>All bookings</h1>

      <div style={{display:'flex', gap:'8px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px'}}>
        {(['all','unassigned','confirmed','completed'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'8px 14px', borderRadius:'16px', border:'1px solid',
            borderColor: filter===f ? '#f4b942' : 'rgba(255,255,255,0.15)',
            backgroundColor: filter===f ? 'rgba(244,185,66,0.15)' : 'transparent',
            color: filter===f ? '#f4b942' : 'rgba(255,255,255,0.5)',
            fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', textTransform:'capitalize'
          }}>{f} {filter===f && `(${filtered.length})`}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)', fontSize:'14px'}}>No bookings found</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {filtered.map((b:any) => (
            <div key={b.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                <div style={{fontSize:'13px', fontWeight:'500'}}>
                  {new Date(b.pickup_time).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})} · {new Date(b.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}
                </div>
                <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:`${statusColor[b.status]}20`, color:statusColor[b.status]}}>
                  {b.status?.replace('_',' ')}
                </span>
              </div>
              <div style={{fontSize:'14px', marginBottom:'4px'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'8px'}}>
                {b.passengers} pax · {b.vehicle?`${b.vehicle.make} ${b.vehicle.model}`:'—'} · € {b.final_price?.toFixed(2)}
              </div>
              {b.driver ? (
                <div style={{fontSize:'12px', color:'#1D9E75'}}>✓ {b.driver.full_name}</div>
              ) : assigning===b.id ? (
                <div style={{display:'flex', gap:'8px'}}>
                  <select value={selectedDriver[b.id]??''} onChange={e => setSelectedDriver(p => ({...p, [b.id]:e.target.value}))}
                    style={{flex:1, fontSize:'13px', padding:'8px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'#f0ede6'}}>
                    <option value="">Select driver</option>
                    {drivers.map((d:any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                  </select>
                  <button onClick={() => selectedDriver[b.id] && assignDriver(b.id, selectedDriver[b.id])}
                    style={{padding:'8px 12px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'4px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>OK</button>
                  <button onClick={() => setAssigning(null)} style={{padding:'8px', background:'none', border:'none', color:'rgba(255,255,255,0.4)', cursor:'pointer'}}>✕</button>
                </div>
              ) : (
                <button onClick={() => setAssigning(b.id)} style={{width:'100%', padding:'9px', backgroundColor:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'5px', color:'rgba(255,255,255,0.7)', fontSize:'12px', cursor:'pointer'}}>
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
