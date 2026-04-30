'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Booking = {
  id: string
  created_at: string
  pickup_time: string
  status: string
  final_price: number
  passengers: number
  flight_number: string | null
  customer_notes: string | null
  source: string
  manual_customer_name: string | null
  manual_customer_phone: string | null
  pickup: { name: string } | null
  dropoff: { name: string } | null
  driver: { name: string } | null
  vehicle: { make: string; model: string } | null
  customer: { full_name: string; phone: string } | null
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  pending:        { bg:'rgba(244,185,66,0.12)',  color:'#f4b942', label:'Pending' },
  confirmed:      { bg:'rgba(29,158,117,0.12)',  color:'#1D9E75', label:'Confirmed' },
  driver_assigned:{ bg:'rgba(55,138,221,0.12)', color:'#378ADD', label:'Driver assigned' },
  completed:      { bg:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', label:'Completed' },
  cancelled:      { bg:'rgba(162,45,45,0.12)',   color:'#f09595', label:'Cancelled' },
}

export default function ProviderBookings() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [providerId, setProviderId] = useState<string>('')
  const [locations, setLocations] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [filter, setFilter] = useState<'all'|'platform'|'manual'>('all')

  const emptyForm = {
    pickup:'', dropoff:'', date:'', time:'14:00',
    passengers:'2', price:'', flightNumber:'',
    customerName:'', customerPhone:'', notes:'', channel:'phone',
    vehicleId:'', driverId:'',
  }
  const [form, setForm] = useState(emptyForm)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
    if (!provider) return
    setProviderId(provider.id)

    const [bRes, lRes, vRes, dRes] = await Promise.all([
      supabase.from('bookings')
        .select(`*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name),
          driver:drivers(name), vehicle:vehicles(make,model),
          customer:users!customer_id(full_name,phone)`)
        .eq('provider_id', provider.id)
        .order('pickup_time', { ascending: false }),
      supabase.from('locations').select('id,name').eq('is_active', true).order('name'),
      supabase.from('vehicles').select('id,make,model,type,seats').eq('provider_id', provider.id),
      supabase.from('drivers').select('id,name').eq('provider_id', provider.id),
    ])

    if (bRes.data) setBookings(bRes.data)
    if (lRes.data) setLocations(lRes.data)
    if (vRes.data) setVehicles(vRes.data)
    if (dRes.data) setDrivers(dRes.data)
    setLoading(false)
  }

  async function handleSave() {
    if (!form.pickup || !form.dropoff || !form.date || !form.price || !form.customerName) return
    setSaving(true)
    const { error } = await supabase.from('bookings').insert({
      provider_id:           providerId,
      pickup_location_id:    form.pickup,
      dropoff_location_id:   form.dropoff,
      pickup_time:           `${form.date}T${form.time}:00`,
      passengers:            parseInt(form.passengers),
      final_price:           parseFloat(form.price),
      price:                 parseFloat(form.price),
      flight_number:         form.flightNumber || null,
      customer_notes:        form.notes || null,
      manual_customer_name:  form.customerName,
      manual_customer_phone: form.customerPhone || null,
      vehicle_id:            form.vehicleId || null,
      driver_id:             form.driverId || null,
      source:                'manual',
      channel:               form.channel || 'phone',
      status:                form.driverId ? 'driver_assigned' : 'confirmed',
      direction:             'outbound',
      discount_pct:          0,
    })
    if (!error) {
      setForm(emptyForm)
      setShowForm(false)
      await load()
    }
    setSaving(false)
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('bookings').update({ status }).eq('id', id)
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  async function assignDriver(id: string, driverId: string) {
    await supabase.from('bookings').update({
      driver_id: driverId || null,
      status: driverId ? 'driver_assigned' : 'confirmed',
    }).eq('id', id)
    await load()
  }

  const filtered = bookings.filter(b => {
    if (filter === 'platform') return b.source !== 'manual'
    if (filter === 'manual') return b.source === 'manual'
    return true
  })

  const inp: React.CSSProperties = { width:'100%', fontSize:'14px', padding:'11px 10px', backgroundColor:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#f0ede6', outline:'none', boxSizing:'border-box' }
  const lbl: React.CSSProperties = { fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px' }
  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', overflow:'hidden' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <div>
          <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'2px'}}>Bookings</h1>
          <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>Platform bookings and manually added trips</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{padding:'10px 18px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase'}}>
          + Add manual booking
        </button>
      </div>

      {/* Manual booking form */}
      {showForm && (
        <div style={{...card, padding:'20px', marginBottom:'16px'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', marginBottom:'16px'}}>New manual booking</p>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div><label style={lbl}>Customer name *</label><input style={inp} value={form.customerName} placeholder="John Smith" onChange={e => setForm(p=>({...p,customerName:e.target.value}))} /></div>
            <div><label style={lbl}>Customer phone</label><input style={inp} value={form.customerPhone} placeholder="+44 7700 000000" onChange={e => setForm(p=>({...p,customerPhone:e.target.value}))} /></div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div>
              <label style={lbl}>Pick-up *</label>
              <select style={inp} value={form.pickup} onChange={e => setForm(p=>({...p,pickup:e.target.value}))}>
                <option value="">—</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Drop-off *</label>
              <select style={inp} value={form.dropoff} onChange={e => setForm(p=>({...p,dropoff:e.target.value}))}>
                <option value="">—</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div><label style={lbl}>Date *</label><input type="date" style={inp} value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} /></div>
            <div><label style={lbl}>Time *</label><input type="time" style={inp} value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))} /></div>
            <div><label style={lbl}>Passengers</label>
              <select style={inp} value={form.passengers} onChange={e => setForm(p=>({...p,passengers:e.target.value}))}>
                {Array.from({length:14},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Price (€) *</label><input type="number" style={inp} value={form.price} placeholder="0.00" onChange={e => setForm(p=>({...p,price:e.target.value}))} /></div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div><label style={lbl}>Flight number</label><input style={inp} value={form.flightNumber} placeholder="TK 1234" onChange={e => setForm(p=>({...p,flightNumber:e.target.value}))} /></div>
            <div>
              <label style={lbl}>Vehicle</label>
              <select style={inp} value={form.vehicleId} onChange={e => setForm(p=>({...p,vehicleId:e.target.value}))}>
                <option value="">— not assigned —</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.seats} seats)</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Driver</label>
              <select style={inp} value={form.driverId} onChange={e => setForm(p=>({...p,driverId:e.target.value}))}>
                <option value="">— not assigned —</option>
                {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
            <div>
              <label style={lbl}>Booking source</label>
              <select style={inp} value={form.channel} onChange={e => setForm(p=>({...p,channel:e.target.value}))}>
                <option value="phone">📞 Phone call</option>
                <option value="whatsapp">💬 WhatsApp</option>
                <option value="email">✉ Email</option>
                <option value="hotel">🏨 Hotel referral</option>
                <option value="walkin">🚶 Walk-in</option>
                <option value="repeat">🔁 Repeat customer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{display:'flex', alignItems:'flex-end'}}>
              <p style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', lineHeight:'1.5', paddingBottom:'4px'}}>Select where this booking came from so you can track which channels bring the most business.</p>
            </div>
          </div>

          <div style={{marginBottom:'16px'}}>
            <label style={lbl}>Notes</label>
            <textarea style={{...inp, resize:'none'}} rows={2} value={form.notes} placeholder="Special requirements, notes..." onChange={e => setForm(p=>({...p,notes:e.target.value}))} />
          </div>

          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={handleSave} disabled={saving || !form.pickup || !form.dropoff || !form.date || !form.price || !form.customerName}
              style={{flex:1, padding:'12px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase'}}>
              {saving ? 'Saving...' : 'Save booking'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(emptyForm) }} style={{padding:'12px 18px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{display:'flex', gap:'6px', marginBottom:'14px'}}>
        {(['all','platform','manual'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 14px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', background:'none', textTransform:'capitalize',
            borderColor: filter===f ? '#f4b942' : 'rgba(255,255,255,0.15)',
            color: filter===f ? '#f4b942' : 'rgba(255,255,255,0.4)',
          }}>{f === 'all' ? `All (${bookings.length})` : f === 'manual' ? `Manual (${bookings.filter(b=>b.source==='manual').length})` : `Platform (${bookings.filter(b=>b.source!=='manual').length})`}</button>
        ))}
      </div>

      {/* Bookings list */}
      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{...card, padding:'40px', textAlign:'center', color:'rgba(255,255,255,0.3)'}}>No bookings yet</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {filtered.map(b => {
            const status = STATUS_STYLES[b.status] ?? STATUS_STYLES.pending
            const isManual = b.source === 'manual'
            const customerName = isManual ? b.manual_customer_name : b.customer?.full_name
            const customerPhone = isManual ? b.manual_customer_phone : b.customer?.phone
            const dt = new Date(b.pickup_time)

            return (
              <div key={b.id} style={card}>
                <div style={{padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap'}}>
                      <span style={{fontSize:'15px', fontWeight:'500'}}>{b.pickup?.name} → {b.dropoff?.name}</span>
                      {isManual && (
                        <span style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', padding:'2px 8px', borderRadius:'8px', backgroundColor:'rgba(55,138,221,0.15)', color:'#378ADD', fontWeight:'600', flexShrink:0}}>
                          Manual
                        </span>
                      )}
                      {isManual && (b as any).channel && (
                        <span style={{fontSize:'9px', padding:'2px 8px', borderRadius:'8px', backgroundColor:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.45)', flexShrink:0}}>
                          {({'phone':'📞 Phone','whatsapp':'💬 WhatsApp','email':'✉ Email','hotel':'🏨 Hotel','walkin':'🚶 Walk-in','repeat':'🔁 Repeat','other':'Other'} as any)[(b as any).channel] || (b as any).channel}
                        </span>
                      )}
                    </div>
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'4px'}}>
                      {dt.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} · {dt.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})} · {b.passengers} pax
                      {b.flight_number && ` · ✈ ${b.flight_number}`}
                    </div>
                    {customerName && (
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                        {customerName}{customerPhone && ` · ${customerPhone}`}
                      </div>
                    )}
                    {b.driver && (
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'2px'}}>
                        Driver: {b.driver.name} · {b.vehicle?.make} {b.vehicle?.model}
                      </div>
                    )}
                    {!b.driver && drivers.length > 0 && (
                      <div style={{marginTop:'8px', display:'flex', alignItems:'center', gap:'8px'}}>
                        <select onChange={e => assignDriver(b.id, e.target.value)}
                          style={{fontSize:'12px', padding:'6px 8px', backgroundColor:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'5px', color:'rgba(255,255,255,0.7)'}}>
                          <option value="">Assign driver...</option>
                          {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>
                  <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'8px', flexShrink:0}}>
                    <span style={{fontSize:'16px', fontWeight:'500', color:'#f4b942'}}>€{b.final_price?.toFixed(2)}</span>
                    <span style={{fontSize:'10px', padding:'3px 10px', borderRadius:'10px', backgroundColor:status.bg, color:status.color, fontWeight:'500'}}>{status.label}</span>
                    {b.status !== 'completed' && b.status !== 'cancelled' && (
                      <div style={{display:'flex', gap:'6px'}}>
                        {b.status !== 'completed' && (
                          <button onClick={() => updateStatus(b.id, 'completed')} style={{fontSize:'10px', padding:'4px 10px', background:'none', border:'1px solid rgba(29,158,117,0.4)', borderRadius:'4px', color:'#1D9E75', cursor:'pointer'}}>
                            Complete
                          </button>
                        )}
                        <button onClick={() => updateStatus(b.id, 'cancelled')} style={{fontSize:'10px', padding:'4px 10px', background:'none', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'4px', color:'#f09595', cursor:'pointer'}}>
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {b.customer_notes && (
                  <div style={{padding:'8px 16px', borderTop:'1px solid rgba(255,255,255,0.05)', fontSize:'12px', color:'rgba(255,255,255,0.35)', fontStyle:'italic'}}>
                    "{b.customer_notes}"
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
