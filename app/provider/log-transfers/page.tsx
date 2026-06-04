'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

type Row = {
  pickup_location_id: string
  dropoff_location_id: string
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
  // return
  is_return: boolean
  return_pickup_location_id: string
  return_dropoff_location_id: string
  return_date: string
  return_time: string
  return_flight_number: string
}

const emptyRow = (): Row => ({
  pickup_location_id: '', dropoff_location_id: '',
  date: '', time: '12:00', passengers: '2', luggage: '2', price: '', currency: 'EUR',
  customer_name: '', customer_phone: '', customer_email: '',
  flight_number: '', vehicle_id: '', driver_id: '', notes: '',
  is_return: false,
  return_pickup_location_id: '', return_dropoff_location_id: '',
  return_date: '', return_time: '10:00', return_flight_number: '',
})

function uuid() {
  return (crypto as any).randomUUID ? (crypto as any).randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random()*16|0; const v = c==='x'?r:(r&0x3|0x8); return v.toString(16)
      })
}

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

  function upd(field: keyof Row, value: string | boolean) {
    setForm(p => {
      const next = { ...p, [field]: value } as Row
      // When turning on return, auto-mirror the outbound locations (swapped) if not already set
      if (field === 'is_return' && value === true) {
        if (!next.return_pickup_location_id) next.return_pickup_location_id = p.dropoff_location_id
        if (!next.return_dropoff_location_id) next.return_dropoff_location_id = p.pickup_location_id
      }
      // Keep return mirror in sync if user changes outbound and hasn't customised return
      if (field === 'dropoff_location_id' && p.is_return && p.return_pickup_location_id === p.dropoff_location_id) {
        next.return_pickup_location_id = value as string
      }
      if (field === 'pickup_location_id' && p.is_return && p.return_dropoff_location_id === p.pickup_location_id) {
        next.return_dropoff_location_id = value as string
      }
      return next
    })
  }

  const rowValid = (r: Row) => {
    const base = r.pickup_location_id && r.dropoff_location_id && r.date && r.time && r.price && r.customer_name
    if (!r.is_return) return base
    return base && r.return_pickup_location_id && r.return_dropoff_location_id && r.return_date && r.return_time
  }

  function addToList() {
    if (!rowValid(form)) return
    setList(prev => [...prev, form])
    setForm(emptyRow())
  }

  function removeRow(i: number) {
    setList(prev => prev.filter((_, idx) => idx !== i))
  }

  function locName(id: string) { return locations.find(l => l.id === id)?.name ?? '—' }

  // Is the return leg a different route than a straight mirror of the outbound?
  function isDifferentRoute(r: Row) {
    if (!r.is_return) return false
    return !(r.return_pickup_location_id === r.dropoff_location_id &&
             r.return_dropoff_location_id === r.pickup_location_id)
  }

  async function submitAll() {
    if (list.length === 0) return
    setSubmitting(true)
    setDone(0)
    try {
      const rows: any[] = []
      let legCount = 0

      for (const r of list) {
        const price = parseFloat(r.price) || 0
        const base = {
          customer_id: userId,
          provider_id: providerId,
          vehicle_id: r.vehicle_id || null,
          driver_id: r.driver_id || null,
          passengers: parseInt(r.passengers) || 1,
          luggage: parseInt(r.luggage) || 0,
          status: 'confirmed',
          discount_pct: 0,
          source: 'manual',
          channel: 'provider_logged',
          manual_customer_name: r.customer_name,
          manual_customer_phone: r.customer_phone || null,
          manual_customer_email: r.customer_email || null,
        }

        if (r.is_return) {
          const gid = uuid()
          // Outbound leg — holds the full price
          rows.push({
            ...base, group_id: gid,
            pickup_location_id: r.pickup_location_id,
            dropoff_location_id: r.dropoff_location_id,
            direction: 'outbound',
            pickup_time: `${r.date}T${r.time}:00`,
            price, final_price: price,
            flight_number: r.flight_number || null,
            internal_notes: r.notes ? `${r.notes} (return trip)` : 'Return trip',
          })
          // Return leg — price 0, noted as paid with outbound
          rows.push({
            ...base, group_id: gid,
            pickup_location_id: r.return_pickup_location_id,
            dropoff_location_id: r.return_dropoff_location_id,
            direction: 'inbound',
            pickup_time: `${r.return_date}T${r.return_time}:00`,
            price: 0, final_price: 0,
            flight_number: r.return_flight_number || null,
            internal_notes: 'Return leg — paid with outbound',
          })
          legCount += 2
        } else {
          rows.push({
            ...base,
            pickup_location_id: r.pickup_location_id,
            dropoff_location_id: r.dropoff_location_id,
            direction: 'outbound',
            pickup_time: `${r.date}T${r.time}:00`,
            price, final_price: price,
            flight_number: r.flight_number || null,
            internal_notes: r.notes || null,
          })
          legCount += 1
        }
      }

      const { error } = await supabase.from('bookings').insert(rows)
      if (error) throw error
      setDone(legCount)
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

  if (loading) return <div style={{padding:'20px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>

  return (
    <div style={{padding:'20px', maxWidth:'780px'}}>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'2px'}}>Log my transfers</h1>
      <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'20px'}}>
        Record transfers you've arranged directly with your own customers. Tick "Return trip" to log both legs at once. Build a list, then save them all. Private to you — kept for your own history and records.
      </p>

      {error && (
        <div style={{backgroundColor:'rgba(162,45,45,0.15)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'8px', padding:'14px', color:'#f09595', fontSize:'13px', marginBottom:'12px'}}>
          {error}
        </div>
      )}

      {done > 0 && (
        <div style={{backgroundColor:'rgba(29,158,117,0.12)', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'8px', padding:'14px', color:'#1D9E75', fontSize:'13px', marginBottom:'12px'}}>
          ✓ {done} transfer leg{done === 1 ? '' : 's'} saved to your records. <a href="/provider/bookings/" style={{color:'#1D9E75', textDecoration:'underline'}}>View bookings</a>
        </div>
      )}

      {/* Entry form */}
      <div style={card}>
        <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', marginBottom:'14px'}}>Outbound journey</p>

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
          <div><label style={lbl}>Flight number</label>
            <input type="text" placeholder="TK 1234" value={form.flight_number} onChange={e => upd('flight_number', e.target.value)} style={inp} />
          </div>
        </div>

        {/* Price */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px'}}>
          <div><label style={lbl}>{form.is_return ? 'Total return price *' : 'Price *'}</label>
            <input type="number" placeholder="0.00" value={form.price} onChange={e => upd('price', e.target.value)} style={inp} />
          </div>
          <div><label style={lbl}>Currency</label>
            <select value={form.currency} onChange={e => upd('currency', e.target.value)} style={inp}>
              <option value="EUR">€ EUR</option>
              <option value="GBP">£ GBP</option>
            </select>
          </div>
        </div>

        {/* Return toggle */}
        <div onClick={() => upd('is_return', !form.is_return)}
          style={{display:'flex', alignItems:'center', gap:'12px', cursor:'pointer', padding:'12px', marginBottom:form.is_return?'14px':'0',
            backgroundColor: form.is_return ? 'rgba(244,185,66,0.08)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${form.is_return ? 'rgba(244,185,66,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius:'6px', userSelect:'none'}}>
          <div style={{width:'20px', height:'20px', borderRadius:'4px', border:`2px solid ${form.is_return ? '#f4b942' : 'rgba(255,255,255,0.3)'}`, backgroundColor: form.is_return ? '#f4b942' : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
            {form.is_return && <span style={{color:'#0f1419', fontSize:'13px', fontWeight:'700', lineHeight:1}}>✓</span>}
          </div>
          <div>
            <div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff'}}>Return trip</div>
            <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px'}}>Log the return leg too — saves entering it separately</div>
          </div>
        </div>

        {/* Return fields */}
        {form.is_return && (
          <div style={{padding:'14px', backgroundColor:'rgba(244,185,66,0.04)', border:'1px solid rgba(244,185,66,0.15)', borderRadius:'8px', marginBottom:'14px'}}>
            <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', marginBottom:'4px'}}>Return journey</p>
            <p style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginBottom:'12px'}}>Auto-filled as the reverse. Change the locations if the return uses a different airport.</p>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px'}}>
              <div><label style={lbl}>Return pick-up *</label>
                <select value={form.return_pickup_location_id} onChange={e => upd('return_pickup_location_id', e.target.value)} style={inp}>
                  <option value="">— select —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Return drop-off *</label>
                <select value={form.return_dropoff_location_id} onChange={e => upd('return_dropoff_location_id', e.target.value)} style={inp}>
                  <option value="">— select —</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>Return date *</label>
                <input type="date" value={form.return_date} onChange={e => upd('return_date', e.target.value)} style={inp} />
              </div>
              <div><label style={lbl}>Return time *</label>
                <input type="time" value={form.return_time} onChange={e => upd('return_time', e.target.value)} style={inp} />
              </div>
              <div><label style={lbl}>Return flight number</label>
                <input type="text" placeholder="TK 5678" value={form.return_flight_number} onChange={e => upd('return_flight_number', e.target.value)} style={inp} />
              </div>
            </div>
            {isDifferentRoute(form) && (
              <div style={{marginTop:'10px', fontSize:'12px', color:'#f4b942', display:'flex', alignItems:'center', gap:'6px'}}>
                ↔ Different route — return isn't a straight reverse of the outbound
              </div>
            )}
          </div>
        )}

        {/* Customer */}
        <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', marginBottom:'10px'}}>Customer</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px', marginBottom:'12px'}}>
          <div><label style={lbl}>Name *</label>
            <input type="text" placeholder="John Smith" value={form.customer_name} onChange={e => upd('customer_name', e.target.value)} style={inp} />
          </div>
          <div><label style={lbl}>Phone</label>
            <input type="tel" placeholder="+44 7700 900000" value={form.customer_phone} onChange={e => upd('customer_phone', e.target.value)} style={inp} />
          </div>
          <div><label style={lbl}>Email</label>
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
        {!rowValid(form) && <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginLeft:'12px'}}>Fill required fields (*) {form.is_return ? 'including return details' : ''}</span>}
      </div>

      {/* The list */}
      {list.length > 0 && (
        <div style={card}>
          <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', marginBottom:'12px'}}>To be saved ({list.length} trip{list.length===1?'':'s'})</p>
          {list.map((r, i) => (
            <div key={i} style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px', padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:'13px', fontWeight:'500', color:'#fff', display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                  {locName(r.pickup_location_id)} → {locName(r.dropoff_location_id)}
                  {r.is_return && <span style={{fontSize:'10px', padding:'2px 7px', borderRadius:'8px', backgroundColor:'rgba(244,185,66,0.12)', color:'#f4b942', fontWeight:'500'}}>↩ Return</span>}
                  {isDifferentRoute(r) && <span style={{fontSize:'10px', padding:'2px 7px', borderRadius:'8px', backgroundColor:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)'}}>↔ diff route</span>}
                </div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {r.date} {r.time}{r.is_return ? ` · ↩ ${locName(r.return_pickup_location_id)} → ${locName(r.return_dropoff_location_id)} ${r.return_date} ${r.return_time}` : ''} · {r.customer_name} · {r.currency === 'GBP' ? '£' : '€'}{r.price}
                </div>
              </div>
              <button onClick={() => removeRow(i)} style={{padding:'5px 10px', background:'none', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'4px', color:'#f09595', fontSize:'11px', cursor:'pointer', fontFamily:'inherit', flexShrink:0}}>Remove</button>
            </div>
          ))}

          <button onClick={submitAll} disabled={submitting}
            style={{marginTop:'14px', width:'100%', padding:'14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:'700', cursor: submitting ? 'not-allowed' : 'pointer', letterSpacing:'0.05em', textTransform:'uppercase', fontFamily:'inherit'}}>
            {submitting ? 'Saving...' : `Save all →`}
          </button>
        </div>
      )}
    </div>
  )
}
