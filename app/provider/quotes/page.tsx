'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminQuotes() {
  const supabase = createClient() as any
  const [requests, setRequests] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'open'|'accepted'|'expired'|'cancelled'>('all')
  const [pushing, setPushing] = useState<string|null>(null)
  const [pushLog, setPushLog] = useState<Record<string,{sent:number,time:string}>>({})
  const [reminding, setReminding] = useState<string|null>(null)
  const [reminderLog, setReminderLog] = useState<Record<string,string>>({})
  const [expanded, setExpanded] = useState<string|null>(null)
  const [editing, setEditing] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [historyMap, setHistoryMap] = useState<Record<string,any[]>>({})
  const [editingOffer, setEditingOffer] = useState<string|null>(null)
  const [editOfferPrice, setEditOfferPrice] = useState<string>('')
  const [savingOffer, setSavingOffer] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data }, { data: locs }] = await Promise.all([
      supabase.from('quote_requests').select(`*,
        pickup:locations!pickup_location_id(name),
        dropoff:locations!dropoff_location_id(name),
        customer:users!customer_id(email, full_name),
        quote_offers(*, provider:providers(company_name, user_id, user:users!user_id(email)), vehicle:vehicles(make,model,seats))
      `).order('created_at', { ascending: false }),
      supabase.from('locations').select('id,name').eq('is_active', true).order('name')
    ])
    if (data) setRequests(data)
    if (locs) setLocations(locs)
    setLoading(false)
  }

  async function loadHistory(requestId: string) {
    if (historyMap[requestId]) return
    const { data } = await supabase.from('quote_status_history')
      .select('*')
      .eq('quote_request_id', requestId)
      .order('created_at', { ascending: true })
    if (data) setHistoryMap(p => ({ ...p, [requestId]: data }))
  }

  async function handleExpand(requestId: string) {
    if (expanded === requestId) { setExpanded(null); return }
    setExpanded(requestId)
    await loadHistory(requestId)
  }

  function startEdit(req: any) {
    setEditing(req.id)
    setEditForm({
      pickup_location_id: req.pickup_location_id,
      dropoff_location_id: req.dropoff_location_id,
      pickup_date: req.pickup_time ? req.pickup_time.slice(0,10) : '',
      pickup_time: req.pickup_time ? req.pickup_time.slice(11,16) : '',
      passengers: String(req.passengers),
      flight_number: req.flight_number || '',
      notes: req.notes || '',
    })
  }

  async function saveEdit(req: any) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('quote_requests').update({
      pickup_location_id:  editForm.pickup_location_id,
      dropoff_location_id: editForm.dropoff_location_id,
      pickup_time:         `${editForm.pickup_date}T${editForm.pickup_time}:00`,
      passengers:          parseInt(editForm.passengers),
      flight_number:       editForm.flight_number || null,
      notes:               editForm.notes || null,
    }).eq('id', req.id)
    await supabase.from('quote_status_history').insert({
      quote_request_id: req.id, status: req.status,
      changed_by: user?.id, changed_by_role: 'admin',
      note: 'Request details edited by admin'
    })
    await load()
    setEditing(null)
    setSaving(false)
  }

  async function saveOfferPrice(req: any, offer: any) {
    if (!editOfferPrice || isNaN(parseFloat(editOfferPrice))) return
    setSavingOffer(true)
    try {
      const newPrice = parseFloat(editOfferPrice)
      const oldPrice = offer.price

      await supabase.from('quote_offers')
        .update({ price: newPrice })
        .eq('id', offer.id)

      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('quote_status_history').insert({
        quote_request_id: req.id, status: req.status,
        changed_by: user?.id, changed_by_role: 'admin',
        note: `Offer price updated by admin: ${oldPrice?.toFixed(2)} → ${newPrice.toFixed(2)} (${offer.provider?.company_name})`
      })

      const sym = req.currency === 'GBP' ? '£' : '€'
      try {
        await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            type: 'offer_price_updated',
            to: req.customer?.email,
            data: {
              customerName: req.customer?.full_name || 'Customer',
              pickup: req.pickup?.name,
              dropoff: req.dropoff?.name,
              date: new Date(req.pickup_time).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }),
              time: new Date(req.pickup_time).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }),
              providerName: offer.provider?.company_name,
              oldPrice: `${sym}${oldPrice?.toFixed(2)}`,
              newPrice: `${sym}${newPrice.toFixed(2)}`,
              quotesUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dalaman.me'}/quotes/`,
            }
          })
        })
      } catch (e) { console.error('Email error:', e) }

      setEditingOffer(null)
      setEditOfferPrice('')
      await load()
    } catch (err) { console.error(err) }
    setSavingOffer(false)
  }

  async function remindCustomer(req: any) {
    setReminding(req.id)
    try {
      const pendingCount = (req.quote_offers ?? []).filter((o:any) => o.status === 'pending').length
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          type: 'offers_waiting_reminder',
          to: req.customer?.email,
          data: {
            customerName: req.customer?.full_name || 'Customer',
            pickup: req.pickup?.name,
            dropoff: req.dropoff?.name,
            date: new Date(req.pickup_time).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long' }),
            offerCount: pendingCount,
            quotesUrl: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://dalaman.me'}/quotes/`,
          }
        })
      })
      const result = await res.json()
      if (res.ok && result.sent) {
        setReminderLog(prev => ({ ...prev, [req.id]: new Date().toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}) }))
        // Log in history
        const { data: { user } } = await supabase.auth.getUser()
        await supabase.from('quote_status_history').insert({
          quote_request_id: req.id, status: req.status,
          changed_by: user?.id, changed_by_role: 'admin',
          note: 'Reminder email sent to customer — offers waiting'
        })
      }
    } catch (err) { console.error(err) }
    setReminding(null)
  }

  async function updateStatus(req: any, newStatus: string) {
    if (!confirm(`Change status to "${newStatus}"?`)) return
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('quote_requests').update({ status: newStatus }).eq('id', req.id)
    await supabase.from('quote_status_history').insert({
      quote_request_id: req.id, status: newStatus,
      changed_by: user?.id, changed_by_role: 'admin',
      note: `Status changed to ${newStatus} by admin`
    })
    setRequests(prev => prev.map(r => r.id === req.id ? {...r, status: newStatus} : r))
  }

  async function pushToProviders(requestId: string) {
    setPushing(requestId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-providers`, {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ requestId }),
      })
      const result = await res.json()
      setPushLog(prev => ({ ...prev, [requestId]: { sent: result.sent ?? 0, time: new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) } }))
    } catch (err) { console.error(err) }
    setPushing(null)
  }

  function exportCSV() {
    const rows = [['Request ID','Customer','Email','From','To','Date','Time','Passengers','Trip Type','Flight','Status','Offers','Lowest (€)','Accepted (€)','Created']]
    requests.forEach(req => {
      const offers = req.quote_offers ?? []
      const prices = offers.map((o:any) => o.price).filter(Boolean)
      const lowest = prices.length ? Math.min(...prices).toFixed(2) : ''
      const accepted = offers.find((o:any) => o.status==='accepted')
      rows.push([req.id, req.customer?.full_name??'', req.customer?.email??'', req.pickup?.name??'', req.dropoff?.name??'',
        new Date(req.pickup_time).toLocaleDateString('en-GB'), new Date(req.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
        req.passengers, req.trip_type, req.flight_number??'', req.status, offers.length, lowest, accepted?accepted.price.toFixed(2):'',
        new Date(req.created_at).toLocaleDateString('en-GB')])
    })
    const csv = rows.map(r => r.map(String).map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'}))
    const a = document.createElement('a'); a.href=url; a.download=`dalaman-quotes-${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const filtered = requests.filter(r => filter==='all' || r.status===filter)
  const statusColors: Record<string,{bg:string,color:string}> = {
    open:      { bg:'rgba(244,185,66,0.12)',  color:'#f4b942' },
    accepted:  { bg:'rgba(29,158,117,0.12)',  color:'#1D9E75' },
    expired:   { bg:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.35)' },
    cancelled: { bg:'rgba(162,45,45,0.12)',   color:'#f09595' },
  }
  const inp = { fontSize:'13px', padding:'8px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6', width:'100%', outline:'none', fontFamily:'inherit' }
  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', marginBottom:'10px', overflow:'hidden' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <div>
          <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'2px'}}>Quote requests</h1>
          <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>View · edit · push to providers · export CSV</p>
        </div>
        <button onClick={exportCSV} style={{padding:'9px 16px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.7)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>↓ Export CSV</button>
      </div>

      {/* Stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px'}}>
        {[
          { label:'Total', value: requests.length },
          { label:'Open', value: requests.filter(r=>r.status==='open').length },
          { label:'Accepted', value: requests.filter(r=>r.status==='accepted').length },
          { label:'Offers', value: requests.reduce((s,r)=>s+(r.quote_offers?.length??0),0) },
        ].map(s => (
          <div key={s.label} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
            <div style={{fontSize:'22px', fontWeight:'500', marginBottom:'4px'}}>{s.value}</div>
            <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap'}}>
        {(['all','open','accepted','expired','cancelled'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 14px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', background:'none', textTransform:'capitalize',
            borderColor:filter===f?'#f4b942':'rgba(255,255,255,0.15)',
            color:filter===f?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : filtered.map((req:any) => {
        const s = statusColors[req.status] ?? statusColors.expired
        const offers = req.quote_offers ?? []
        const acceptedOffer = offers.find((o:any) => o.status==='accepted')
        const pendingCount = offers.filter((o:any) => o.status === 'pending').length
        const isExpanded = expanded === req.id
        const isEditing = editing === req.id
        const log = pushLog[req.id]
        const reminderTime = reminderLog[req.id]
        const history = historyMap[req.id] ?? []
        const canEdit = req.status === 'open'
        const canRemind = req.status === 'open' && pendingCount > 0
        const sym = req.currency === 'GBP' ? '£' : '€'

        return (
          <div key={req.id} style={card}>
            <div style={{padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', cursor:'pointer'}} onClick={() => !isEditing && handleExpand(req.id)}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap'}}>
                  <span style={{fontSize:'15px', fontWeight:'500'}}>{req.pickup?.name} → {req.dropoff?.name}</span>
                  <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'8px', backgroundColor:s.bg, color:s.color, fontWeight:'500', textTransform:'capitalize'}}>{req.status}</span>
                  {req.currency && <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'8px', backgroundColor:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', fontWeight:'600'}}>{sym} {req.currency}</span>}
                </div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {new Date(req.pickup_time).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} · {new Date(req.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · {req.passengers} pax
                  {req.trip_type==='return'&&' · Return'}{req.flight_number&&` · ✈ ${req.flight_number}`}
                </div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', marginTop:'2px'}}>{req.customer?.full_name||'—'} · {req.customer?.email||'—'}</div>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'4px', flexShrink:0}}>
                <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{offers.length} offer{offers.length!==1?'s':''}</span>
                {acceptedOffer && <span style={{fontSize:'13px', fontWeight:'500', color:'#1D9E75'}}>{sym} {acceptedOffer.price?.toFixed(2)}</span>}
                <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>{isExpanded?'▲':'▼'}</span>
              </div>
            </div>

            {isExpanded && (
              <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'14px 16px'}}>

                {/* Edit form */}
                {isEditing ? (
                  <div style={{marginBottom:'16px', padding:'14px', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'6px'}}>
                    <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#f4b942', marginBottom:'12px'}}>Edit request</p>
                    <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                      <div>
                        <label style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>PICK-UP</label>
                        <select value={editForm.pickup_location_id} onChange={e => setEditForm((p:any)=>({...p,pickup_location_id:e.target.value}))} style={inp}>
                          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>DROP-OFF</label>
                        <select value={editForm.dropoff_location_id} onChange={e => setEditForm((p:any)=>({...p,dropoff_location_id:e.target.value}))} style={inp}>
                          {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>DATE</label>
                        <input type="date" value={editForm.pickup_date} onChange={e => setEditForm((p:any)=>({...p,pickup_date:e.target.value}))} style={inp} />
                      </div>
                      <div>
                        <label style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>TIME</label>
                        <input type="time" value={editForm.pickup_time} onChange={e => setEditForm((p:any)=>({...p,pickup_time:e.target.value}))} style={inp} />
                      </div>
                      <div>
                        <label style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>PASSENGERS</label>
                        <select value={editForm.passengers} onChange={e => setEditForm((p:any)=>({...p,passengers:e.target.value}))} style={inp}>
                          {Array.from({length:14},(_,i)=>i+1).map(n=><option key={n} value={n}>{n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>FLIGHT</label>
                        <input type="text" value={editForm.flight_number} onChange={e => setEditForm((p:any)=>({...p,flight_number:e.target.value}))} placeholder="TK 1234" style={inp} />
                      </div>
                    </div>
                    <div style={{marginBottom:'10px'}}>
                      <label style={{fontSize:'10px', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>NOTES</label>
                      <textarea value={editForm.notes} onChange={e => setEditForm((p:any)=>({...p,notes:e.target.value}))} rows={2} style={{...inp, resize:'none'}} />
                    </div>
                    <div style={{display:'flex', gap:'8px'}}>
                      <button onClick={() => saveEdit(req)} disabled={saving} style={{flex:1, padding:'9px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit'}}>
                        {saving?'Saving...':'Save changes'}
                      </button>
                      <button onClick={() => setEditing(null)} style={{padding:'9px 14px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>Cancel</button>
                    </div>
                  </div>
                ) : null}

                {/* Offers */}
                {offers.length > 0 && (
                  <div style={{marginBottom:'14px'}}>
                    <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'8px'}}>Offers</p>
                    {offers.map((offer:any) => {
                      const os: Record<string,{bg:string,color:string}> = { pending:{bg:'rgba(244,185,66,0.1)',color:'#f4b942'}, accepted:{bg:'rgba(29,158,117,0.1)',color:'#1D9E75'}, rejected:{bg:'rgba(255,255,255,0.04)',color:'rgba(255,255,255,0.3)'} }
                      const o = os[offer.status] ?? os.pending
                      const isEditingThisOffer = editingOffer === offer.id

                      return (
                        <div key={offer.id} style={{padding:'10px 12px', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.06)', marginBottom:'6px'}}>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'10px'}}>
                            <div style={{flex:1}}>
                              <div style={{fontSize:'13px', fontWeight:'500', marginBottom:'2px'}}>{offer.provider?.company_name??'—'}</div>
                              {offer.vehicle&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{offer.vehicle.make} {offer.vehicle.model} · {offer.vehicle.seats} seats</div>}
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:'10px', flexShrink:0}}>
                              <span style={{fontSize:'16px', fontWeight:'500', color:'#f4b942'}}>{sym} {offer.price?.toFixed(2)}</span>
                              <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'8px', backgroundColor:o.bg, color:o.color, fontWeight:'500', textTransform:'capitalize'}}>{offer.status}</span>
                              {offer.status !== 'rejected' && (
                                <button
                                  onClick={() => { setEditingOffer(offer.id); setEditOfferPrice(offer.price?.toFixed(2) ?? '') }}
                                  style={{fontSize:'11px', padding:'3px 8px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', cursor:'pointer', fontFamily:'inherit'}}>
                                  ✏️ Edit price
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditingThisOffer && (
                            <div style={{marginTop:'10px', padding:'10px', backgroundColor:'rgba(244,185,66,0.05)', border:'1px solid rgba(244,185,66,0.15)', borderRadius:'5px'}}>
                              <p style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginBottom:'8px'}}>
                                Update price — customer will be notified by email
                              </p>
                              <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                                <span style={{color:'#f4b942', fontSize:'16px', fontWeight:'600'}}>{sym}</span>
                                <input
                                  type="number"
                                  value={editOfferPrice}
                                  onChange={e => setEditOfferPrice(e.target.value)}
                                  step="0.01"
                                  min="0"
                                  style={{...inp, width:'120px', fontSize:'16px', fontWeight:'500'}}
                                  autoFocus
                                />
                                <button
                                  onClick={() => saveOfferPrice(req, offer)}
                                  disabled={savingOffer}
                                  style={{padding:'8px 14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit'}}>
                                  {savingOffer ? 'Saving...' : 'Save & notify'}
                                </button>
                                <button
                                  onClick={() => { setEditingOffer(null); setEditOfferPrice('') }}
                                  style={{padding:'8px 12px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>
                                  Cancel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* Status history */}
                {history.length > 0 && (
                  <div style={{marginBottom:'14px'}}>
                    <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'8px'}}>Status history</p>
                    {history.map((h:any) => (
                      <div key={h.id} style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'12px', marginBottom:'4px'}}>
                        <div style={{width:'6px', height:'6px', borderRadius:'50%', backgroundColor:'#f4b942', flexShrink:0}} />
                        <span style={{color:'rgba(255,255,255,0.6)', textTransform:'capitalize', fontWeight:'500'}}>{h.status}</span>
                        <span style={{color:'rgba(255,255,255,0.3)'}}>by {h.changed_by_role}</span>
                        {h.note&&<span style={{color:'rgba(255,255,255,0.25)', fontStyle:'italic'}}>— {h.note}</span>}
                        <span style={{color:'rgba(255,255,255,0.2)', marginLeft:'auto'}}>{new Date(h.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} {new Date(h.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                  {canEdit && !isEditing && (
                    <button onClick={() => startEdit(req)} style={{padding:'7px 14px', background:'none', border:'1px solid rgba(255,255,255,0.2)', borderRadius:'5px', color:'rgba(255,255,255,0.6)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>✏️ Edit</button>
                  )}
                  {req.status === 'open' && (
                    <button onClick={() => updateStatus(req,'cancelled')} style={{padding:'7px 14px', background:'none', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'5px', color:'#f09595', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>Cancel request</button>
                  )}
                  {req.status === 'cancelled' && (
                    <button onClick={() => updateStatus(req,'open')} style={{padding:'7px 14px', background:'none', border:'1px solid rgba(29,158,117,0.4)', borderRadius:'5px', color:'#1D9E75', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>Re-open</button>
                  )}
                  {canRemind && (
                    <button onClick={() => remindCustomer(req)} disabled={reminding===req.id} style={{padding:'7px 14px', background:'none', border:'1px solid rgba(100,149,237,0.4)', borderRadius:'5px', color:'#6495ED', fontSize:'12px', cursor:reminding===req.id?'not-allowed':'pointer', fontFamily:'inherit'}}>
                      {reminding===req.id ? 'Sending...' : '📧 Remind customer'}
                    </button>
                  )}
                  <button onClick={() => pushToProviders(req.id)} disabled={pushing===req.id} style={{padding:'7px 14px', backgroundColor:pushing===req.id?'rgba(244,185,66,0.3)':'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:pushing===req.id?'not-allowed':'pointer', fontFamily:'inherit'}}>
                    {pushing===req.id?'Sending...':'📨 Push to providers'}
                  </button>
                  {log&&<span style={{fontSize:'12px', color:'#1D9E75'}}>✓ Sent to {log.sent} at {log.time}</span>}
                  {reminderTime&&<span style={{fontSize:'12px', color:'#6495ED'}}>✓ Reminder sent at {reminderTime}</span>}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
