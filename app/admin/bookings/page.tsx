'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminBookings() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'pending'|'confirmed'|'completed'|'cancelled'>('all')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('*, customer:users(email, full_name), provider:providers(company_name), driver:drivers(full_name), pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
        .order('created_at', {ascending:false})
      if (data) setBookings(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = bookings.filter(b => {
    if (filter==='all') return true
    if (filter==='confirmed') return b.status==='confirmed'||b.status==='driver_assigned'
    return b.status===filter
  })

  const statusColor: Record<string,string> = {
    pending:'#EF9F27', confirmed:'#1D9E75', driver_assigned:'#378ADD', completed:'#8a8680', cancelled:'#E24B4A'
  }

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>All bookings</h1>
        <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{filtered.length}</span>
      </div>

      <div style={{display:'flex', gap:'8px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px'}}>
        {(['all','pending','confirmed','completed','cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 12px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', textTransform:'capitalize', background:'none',
            borderColor:filter===f?'#f4b942':'rgba(255,255,255,0.15)',
            color:filter===f?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {filtered.map((b:any) => (
            <div key={b.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                <div>
                  <div style={{fontSize:'13px', fontWeight:'500'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
                  <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px'}}>
                    {new Date(b.pickup_time).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} · {new Date(b.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}
                  </div>
                </div>
                <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', flexShrink:0, marginLeft:'8px', backgroundColor:`${statusColor[b.status]}20`, color:statusColor[b.status]}}>
                  {b.status?.replace('_',' ')}
                </span>
              </div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'4px'}}>
                {b.customer?.full_name||b.customer?.email||'—'} · {b.passengers} pax
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {b.provider?.company_name||'—'}{b.driver?` · ${b.driver.full_name}`:''}
                </div>
                <div style={{fontSize:'14px', fontWeight:'500'}}>€{b.final_price?.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
