'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

type Row = {
  pickup_location_id: string
  dropoff_location_id: string
  direction: 'outbound' | 'inbound'
  date: string
  time: string
  passengers: string
  luggage: string
  price: string
  currency: 'EUR' | 'GBP'
  customer_name: string
  customer_phone: string
  customer_email: string
  flight_number: string
  vehicle_id: string
  driver_id: string
  notes: string
}

const emptyRow = (): Row => ({
  pickup_location_id: '', dropoff_location_id: '', direction: 'outbound',
  date: '', time: '12:00', passengers: '2', luggage: '2', price: '', currency: 'EUR',
  customer_name: '', customer_phone: '', customer_email: '',
  flight_number: '', vehicle_id: '', driver_id: '', notes: '',
})

export default function LogTransfers() {
  const supabase = createClient() as any
  const [providerId, setProviderId] = useState('')
  const [userId, setUserId] = useState('')
  const [locations, setLocations] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState<Row>(emptyRow())
  const [list, setList] = useState<Row[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(0)

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not signed in'); setLoading(false); return }
      setUserId(user.id)

      const { data: provider, error: provErr } = await supabase
        .from('providers').select('id').eq('user_id', user.id).single()
      if (provErr || !provider) { setError('Provider account not found.'); setLoading(false); return }
      setProviderId(provider.id)

      const [{ data: locs }, { data: vh }, { data: dr }] = await Promise.all([
        supabase.from('locations').select('id,name').eq('is_active', true).order('name'),
        supabase.from('vehicles').select('id,make,model,seats').eq('provider_id', provider.id),
        supabase.from('drivers').select('id,full_name').eq('provider_id', provider.id),
      ])
      if (locs) setLocations(locs)
      if (vh) setVehicles(vh)
      if (dr) setDrivers(dr)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  function upd(field: keyof Row, value: string) {
    setForm(p => ({ ...p, [field]: value }))
  }

  const rowValid = (r: Row) =>
    r.pickup_location_id && r.dropoff_location_id && r.date && r.time && r.price && r.customer_name

  function addToList() {
    if (!rowValid(form)) return
    setList(prev => [...prev, form])
    setForm(emptyRow())
  }

  function removeRow(i: number) {
    setList(prev => prev.filter((_, idx) => idx !== i))
  }

  function locName(id: string) { return locations.find(l => l.id === id)?.name ?? '—' }

  async function submitAll() {
    if (list.length === 0) return
    setSubmitting(true)
    setDone(0)
    try {
      const rows = list.map(r => ({
        customer_id: userId,                // placeholder — provider's own id; real customer in manual_* fields
        provider_id: providerId,
        vehicle_id: r.vehicle_id || null,
        driver_id: r.driver_id || null,
        pickup_location_id: r.pickup_location_id,
        dropoff_location_id: r.dropoff_location_id,
        direction: r.direction,
        pickup_time: `${r.date}T${r.time}:00`,
        passengers: parseInt(r.passengers) || 1,
        luggage: parseInt(r.luggage) || 0,
        status: 'confirmed',
        price: parseFloat(r.price) || 0,
        discount_pct: 0,
        final_price: parseFloat(r.price) || 0,
        flight_number: r.flight_number || null,
        internal_notes: r.notes || null,
        source: 'manual',
        channel: 'provider_logged',
        manual_customer_name: r.customer_name,
        manual_customer_phone: r.customer_phone || null,
        manual_customer_email: r.customer_email || null,
      }))

      const { error } = await supabase.from('bookings').insert(rows)
      if (error) throw error
      setDone(list.length)
      setList([])
    } catch (err: any) {
      console.error(err)
      setError(`Could not save: ${err.message}`)
    }
    setSubmitting(false)
  }

  const inp: React.CSSProperties = { fontSize:'14px', padding:'10px', backgroundColor:'#1e2530', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#f0ede6', outline:'none', width:'100%', boxSizing:'border-box', colorScheme:'dark' as any }
  const lbl: React.CSSProperties = { fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px' }
  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px', marginBottom:'12px' }
  const sym = form.currency === 'GBP' ? '£' : '€'

  if (loading) return <div style={{padding:'20px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>

  return (
    <div style={{padding:'20px', maxWidth:'780px'}}>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'2px'}}>Log my transfers</h1>
      <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'20px'}}>
        Record transfers you've arranged directly with your own customers. Build a list, then save them all at once. These are private to you — kept for your own history and records.
      </p>

      {error && (
        <div style={{backgroundColor:'rgba(162,45,45,0.15)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'8px', padding:'14px', color:'#f09595', fontSize:'13px', marginBottom:'12px'}}>
          {error}
        </div>
      )}

      {done > 0 && (
        <div style={{backgroundColor:'rgba(29,158,117,0.12)', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'8px', padding:'14px', color:'#1D9E75', fontSize:'13px', marginBottom:'12px'}}>
          ✓ {done} transfer{done === 1 ? '' : 's'} saved to your records. <a href="/provider/bookings/" style={{color:'#1D9E75', textDecoration:'underline'}}>View bookings</a>
        </div>
      )}

      {/* Entry form */}
      <div style={card}>
        <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', marginBottom:'14px'}}>Add a transfer</p>

        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
          <div><label style={lbl}>Pick-up *</label>
            <select value={form.pickup_location_id} onChange={e => upd('pickup_location_id', e.target.value)} style={inp}>
              <option value="">— select —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Drop-off *</label>
            <select value={form.dropoff_location_id} onChange={e => upd('dropoff_location_id', e.target.value)} style={inp}>
              <option value="">— select —</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Date *</label>
            <input type="date" value={form.date} onChange={e => upd('date', e.target.value)} style={inp} />
          </div>
          <div><label style={lbl}>Time *</label>
            <input type="time" value={form.time} onChange={e => upd('time', e.target.value)} style={inp} />
          </div>
          <div><label style={lbl}>Direction</label>
            <select value={form.direction} onChange={e => upd('direction', e.target.value)} style={inp}>
              <option value="outbound">Outbound (airport → resort)</option>
              <option value="inbound">Inbound (resort → airport)</option>
            </select>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
            <div><label style={lbl}>Passengers</label>
              <select value={form.passengers} onChange={e => upd('passengers', e.target.value)} style={inp}>
                {Array.from({length:14},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Bags</label>
              <select value={form.luggage} onChange={e => upd('luggage', e.target.value)} style={inp}>
                {Array.from({length:15},(_,i)=>i).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px'}}>
            <div><label style={lbl}>Price *</label>
              <input type="number" placeholder="0.00" value={form.price} onChange={e => upd('price', e.target.value)} style={inp} />
            </div>
            <div><label style={lbl}>Currency</label>
              <select value={form.currency} onChange={e => upd('currency', e.target.value)} style={inp}>
                <option value="EUR">€ EUR</option>
                <option value="GBP">£ GBP</option>
              </select>
            </div>
          </div>
          <div><label style={lbl}>Flight number</label>
            <input type="text" placeholder="TK 1234" value={form.flight_number} onChange={e => upd('flight_number', e.target.value)} style={inp} />
          </div>
        </div>

        {/* Customer */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'12px'}}>
          <div><label style={lbl}>Customer name *</label>
            <input type="text" placeholder="John Smith" value={form.customer_name} onChange={e => upd('customer_name', e.target.value)} style={inp} />
          </div>
          <div><label style={lbl}>Customer phone</label>
            <input type="tel" placeholder="+44 7700 900000" value={form.customer_phone} onChange={e => upd('customer_phone', e.target.value)} style={inp} />
          </div>
          <div><label style={lbl}>Customer email</label>
            <input type="email" placeholder="john@email.com" value={form.customer_email} onChange={e => upd('customer_email', e.target.value)} style={inp} />
          </div>
        </div>

        {/* Vehicle / driver / notes */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px'}}>
          <div><label style={lbl}>Vehicle</label>
            <select value={form.vehicle_id} onChange={e => upd('vehicle_id', e.target.value)} style={inp}>
              <option value="">— optional —</option>
              {vehicles.map(v => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.seats} seats)</option>)}
            </select>
          </div>
          <div><label style={lbl}>Driver</label>
            <select value={form.driver_id} onChange={e => upd('driver_id', e.target.value)} style={inp}>
              <option value="">— optional —</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
            </select>
          </div>
        </div>
        <div style={{marginBottom:'14px'}}>
          <label style={lbl}>Notes</label>
          <input type="text" placeholder="Any extra info..." value={form.notes} onChange={e => upd('notes', e.target.value)} style={inp} />
        </div>

        <button onClick={addToList} disabled={!rowValid(form)}
          style={{padding:'11px 20px', backgroundColor: rowValid(form) ? '#f4b942' : 'rgba(244,185,66,0.3)', color: rowValid(form) ? '#0f1419' : 'rgba(255,255,255,0.3)', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor: rowValid(form) ? 'pointer' : 'not-allowed', letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:'inherit'}}>
          + Add to list
        </button>
        {!rowValid(form) && <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginLeft:'12px'}}>Pick-up, drop-off, date, time, price and customer name are required</span>}
      </div>

      {/* The list */}
      {list.length > 0 && (
        <div style={card}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px'}}>
            <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', margin:0}}>To be saved ({list.length})</p>
          </div>
          {list.map((r, i) => (
            <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:'13px', fontWeight:'500', color:'#fff'}}>{locName(r.pickup_location_id)} → {locName(r.dropoff_location_id)}</div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {r.date} · {r.time} · {r.passengers} pax · {r.customer_name} · {r.currency === 'GBP' ? '£' : '€'}{r.price}
                </div>
              </div>
              <button onClick={() => removeRow(i)} style={{padding:'5px 10px', background:'none', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'4px', color:'#f09595', fontSize:'11px', cursor:'pointer', fontFamily:'inherit', flexShrink:0}}>Remove</button>
            </div>
          ))}

          <button onClick={submitAll} disabled={submitting}
            style={{marginTop:'14px', width:'100%', padding:'14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:'700', cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:'inherit'}}>
            {submitting ? 'Saving...' : `Save all ${list.length} transfer${list.length === 1 ? '' : 's'} →`}
          </button>
        </div>
      )}
    </div>
  )
}
