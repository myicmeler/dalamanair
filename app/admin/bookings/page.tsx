'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

// Currency symbol from the booking's own currency (backfilled from the linked quote).
// Falls back to € for anything that isn't GBP.
const sym = (c?: string) => (c === 'GBP' ? '£' : '€')

export default function AdminBookings() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'pending'|'confirmed'|'completed'|'cancelled'>('all')

  // ---- Edit state -------------------------------------------------------
  // editingId is the booking being edited. req holds the parent quote_request
  // fetched lazily on Edit, because hotel_name lives on the request and not on
  // the booking. Fetching it here rather than widening the list query means a
  // failure can only break the form, never the listing.
  const [editingId, setEditingId] = useState<string|null>(null)
  const [req, setReq] = useState<any>(null)
  const [draft, setDraft] = useState({ flightNumber: '', hotelName: '', internalNotes: '' })
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{kind:'ok'|'err', text:string}|null>(null)

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

  async function openEditor(b: any) {
    setMsg(null)
    setEditingId(b.id)
    setReq(null)
    setDraft({
      flightNumber: b.flight_number ?? '',
      hotelName: '',
      internalNotes: b.internal_notes ?? '',
    })
    // Manual bookings have no parent request. Nothing further to load.
    if (!b.request_id) return
    const { data, error } = await supabase
      .from('quote_requests')
      .select('id, status, hotel_name, flight_number, return_flight_number')
      .eq('id', b.request_id)
      .single()
    if (error) {
      setMsg({kind:'err', text:`Could not load the linked request: ${error.message}. Flight number and notes can still be saved to the booking.`})
      return
    }
    setReq(data)
    setDraft(d => ({ ...d, hotelName: data?.hotel_name ?? '' }))
  }

  function closeEditor() {
    setEditingId(null)
    setReq(null)
    setMsg(null)
  }

  async function save(b: any) {
    setBusy(true)
    setMsg(null)

    const flight = draft.flightNumber.trim()
    const hotel = draft.hotelName.trim()
    const notes = draft.internalNotes.trim()

    // What actually changed, for the audit note.
    const changes: string[] = []
    if ((b.flight_number ?? '') !== flight) changes.push(`flight number "${b.flight_number ?? '—'}" to "${flight || '—'}"`)
    if ((b.internal_notes ?? '') !== notes) changes.push('internal notes')
    if (req && (req.hotel_name ?? '') !== hotel) changes.push(`hotel "${req.hotel_name ?? '—'}" to "${hotel || '—'}"`)

    if (changes.length === 0) {
      setBusy(false)
      setMsg({kind:'ok', text:'Nothing changed.'})
      return
    }

    try {
      // 1. The booking row itself.
      const { error: bookingErr } = await supabase
        .from('bookings')
        .update({ flight_number: flight || null, internal_notes: notes || null })
        .eq('id', b.id)
      if (bookingErr) throw new Error(`booking update failed: ${bookingErr.message}`)

      // 2. The parent request. The flight number lives in a different column
      //    depending on which leg this booking is — outbound writes
      //    flight_number, inbound writes return_flight_number. This is the
      //    three-rows-no-sync problem handled here so nobody has to remember it.
      if (b.request_id && req) {
        const patch: any = { hotel_name: hotel || null }
        if (b.direction === 'inbound') patch.return_flight_number = flight || null
        else patch.flight_number = flight || null

        const { error: reqErr } = await supabase
          .from('quote_requests')
          .update(patch)
          .eq('id', b.request_id)
        if (reqErr) throw new Error(`request update failed: ${reqErr.message}`)

        // 3. Audit row. Nothing else logs a field edit — only status changes
        //    are captured, by trg_log_booking_status_change. status and
        //    changed_by_role are NOT NULL, so both must be supplied. The
        //    booking's status is written unchanged; the detail goes in note.
        const { data: { user } } = await supabase.auth.getUser()
        const { error: histErr } = await supabase
          .from('quote_status_history')
          .insert({
            quote_request_id: b.request_id,
            status: req.status,
            changed_by: user?.id ?? null,
            changed_by_role: 'admin',
            note: `Admin edited ${b.direction ?? 'booking'} leg: ${changes.join('; ')}.`,
          })
        // A failed audit row must not look like a failed save, but it must not
        // be swallowed either — that is how silent write failures started last time.
        if (histErr) {
          setMsg({kind:'err', text:`Saved, but the audit row failed: ${histErr.message}`})
        }
      }

      // Reflect the change locally rather than refetching the whole list.
      setBookings(prev => prev.map(x => x.id === b.id
        ? { ...x, flight_number: flight || null, internal_notes: notes || null }
        : x))
      if (req) setReq({ ...req, hotel_name: hotel || null })

      setMsg(m => m ?? {kind:'ok', text:'Saved. No email was sent — tell the provider yourself.'})
    } catch (err: any) {
      setMsg({kind:'err', text: err?.message ?? 'Save failed.'})
    }
    setBusy(false)
  }

  const inp = { width:'100%', fontSize:'14px', padding:'9px 10px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'5px', color:'#ffffff', outline:'none', boxSizing:'border-box' as const }
  const lbl = { fontSize:'10px', letterSpacing:'0.08em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px' }

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
                    {new Date(b.pickup_time).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric', timeZone:'UTC'})} · {new Date(b.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'UTC'})}
                  </div>
                </div>
                <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', flexShrink:0, marginLeft:'8px', backgroundColor:`${statusColor[b.status]}20`, color:statusColor[b.status]}}>
                  {b.status?.replace('_',' ')}
                </span>
              </div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'4px'}}>
                {(b.source==='manual' ? (b.manual_customer_name||b.manual_customer_email) : (b.customer?.full_name||b.customer?.email)) || '—'}{b.source==='manual'?' · logged':''} · {b.passengers} pax
              </div>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {b.provider?.company_name||'—'}{b.driver?` · ${b.driver.full_name}`:''}
                </div>
                <div style={{fontSize:'14px', fontWeight:'500'}}>{sym(b.currency)}{b.final_price?.toFixed(2)}</div>
              </div>

              {/* Flight number and edit trigger */}
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'10px', paddingTop:'10px', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {b.direction === 'inbound' ? 'Return' : 'Outbound'} · Flight{' '}
                  <span style={{color: b.flight_number ? 'rgba(255,255,255,0.75)' : '#EF9F27'}}>
                    {b.flight_number || 'not set'}
                  </span>
                </div>
                {editingId === b.id ? (
                  <button onClick={closeEditor} style={{background:'none', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.5)', borderRadius:'5px', fontSize:'11px', padding:'5px 12px', cursor:'pointer'}}>Close</button>
                ) : (
                  <button onClick={() => openEditor(b)} style={{background:'none', border:'1px solid rgba(244,185,66,0.4)', color:'#f4b942', borderRadius:'5px', fontSize:'11px', padding:'5px 12px', cursor:'pointer'}}>Edit</button>
                )}
              </div>

              {/* Editor */}
              {editingId === b.id && (
                <div style={{marginTop:'12px', padding:'12px', backgroundColor:'rgba(0,0,0,0.25)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px'}}>
                  <div style={{marginBottom:'10px'}}>
                    <label style={lbl}>Flight number</label>
                    <input type="text" value={draft.flightNumber} onChange={e => setDraft(d => ({...d, flightNumber: e.target.value}))} placeholder="EZY3281" style={inp} />
                    <p style={{fontSize:'10px', color:'rgba(255,255,255,0.3)', margin:'5px 0 0'}}>
                      Saves to this booking and to the {b.direction === 'inbound' ? 'return' : 'outbound'} column on the linked request.
                    </p>
                  </div>

                  {b.request_id ? (
                    <div style={{marginBottom:'10px'}}>
                      <label style={lbl}>Hotel name</label>
                      <input type="text" value={draft.hotelName} onChange={e => setDraft(d => ({...d, hotelName: e.target.value}))} placeholder={req ? 'e.g. Marti Resort, Icmeler' : 'Loading request...'} disabled={!req} style={{...inp, opacity: req ? 1 : 0.5}} />
                      <p style={{fontSize:'10px', color:'rgba(255,255,255,0.3)', margin:'5px 0 0'}}>Stored on the request and shared by both legs.</p>
                    </div>
                  ) : (
                    <p style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', margin:'0 0 10px'}}>Manually logged booking — no linked request, so no hotel field and no audit row.</p>
                  )}

                  <div style={{marginBottom:'12px'}}>
                    <label style={lbl}>Internal notes</label>
                    <textarea value={draft.internalNotes} onChange={e => setDraft(d => ({...d, internalNotes: e.target.value}))} rows={2} placeholder="Not shown to the customer" style={{...inp, resize:'none'}} />
                  </div>

                  <p style={{fontSize:'11px', color:'rgba(244,185,66,0.75)', lineHeight:'1.5', margin:'0 0 12px'}}>
                    Saving sends no email. The provider and driver keep the old details until you tell them.
                  </p>

                  <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                    <button onClick={() => save(b)} disabled={busy} style={{backgroundColor: busy ? 'rgba(244,185,66,0.3)' : '#f4b942', color: busy ? 'rgba(255,255,255,0.4)' : '#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', padding:'9px 18px', cursor: busy ? 'not-allowed' : 'pointer', textTransform:'uppercase', letterSpacing:'0.05em'}}>
                      {busy ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={closeEditor} disabled={busy} style={{background:'none', border:'1px solid rgba(255,255,255,0.15)', color:'rgba(255,255,255,0.5)', borderRadius:'5px', fontSize:'12px', padding:'9px 14px', cursor:'pointer'}}>Cancel</button>
                  </div>

                  {msg && (
                    <p style={{fontSize:'11px', lineHeight:'1.5', margin:'10px 0 0', color: msg.kind === 'ok' ? '#1D9E75' : '#E24B4A'}}>
                      {msg.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
