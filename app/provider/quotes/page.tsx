'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderQuotes() {
  const supabase = createClient() as any
  const [requests, setRequests] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [providerId, setProviderId] = useState('')
  const [submitting, setSubmitting] = useState<string|null>(null)
  const [declining, setDeclining] = useState<string|null>(null)
  const [declineModal, setDeclineModal] = useState<string|null>(null)
  const [declineComment, setDeclineComment] = useState('')
  const [offers, setOffers] = useState<Record<string, { price:string, vehicleId:string, notes:string }>>({})

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setError('Not signed in'); setLoading(false); return }

        const { data: provider, error: provErr } = await supabase
          .from('providers').select('id, company_name').eq('user_id', user.id).single()

        if (provErr || !provider) {
          setError('Provider account not found. Make sure your account is approved.')
          setLoading(false)
          return
        }

        setProviderId(provider.id)

        const { data: declined } = await supabase
          .from('quote_declines').select('request_id').eq('provider_id', provider.id)
        const declinedIds = new Set((declined ?? []).map((d: any) => d.request_id))

        const { data: reqs, error: reqErr } = await supabase
          .from('quote_requests')
          .select(`*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)`)
          .eq('status', 'open')
          .gt('expires_at', new Date().toISOString())
          .order('created_at', { ascending: false })

        if (reqErr) {
          console.error('Quote requests error:', reqErr)
          setError(`Could not load quote requests: ${reqErr.message}`)
          setLoading(false)
          return
        }

        if (reqs && reqs.length > 0) {
          const { data: myOffers } = await supabase
            .from('quote_offers').select('request_id, status, expiry_reason')
            .eq('provider_id', provider.id)
            .in('request_id', reqs.map((r: any) => r.id))

          const offeredMap: Record<string, any> = {}
          for (const o of (myOffers ?? [])) {
            offeredMap[o.request_id] = o
          }

          const visible = reqs
            .filter((r: any) => !declinedIds.has(r.id))
            .map((r: any) => ({
              ...r,
              already_offered: !!offeredMap[r.id],
              offer_status: offeredMap[r.id]?.status ?? null,
              offer_expiry_reason: offeredMap[r.id]?.expiry_reason ?? null,
            }))

          setRequests(visible)
        } else {
          setRequests([])
        }

        const { data: vh } = await supabase
          .from('vehicles').select('*').eq('provider_id', provider.id)
        if (vh) setVehicles(vh)

      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function updateOffer(reqId: string, field: string, value: string) {
    setOffers(prev => ({ ...prev, [reqId]: { price:'', vehicleId:'', notes:'', ...prev[reqId], [field]: value } }))
  }

  async function submitOffer(reqId: string) {
    const offer = offers[reqId]
    if (!offer?.price) return
    setSubmitting(reqId)
    try {
      const { error } = await supabase.from('quote_offers').insert({
        request_id:  reqId,
        provider_id: providerId,
        vehicle_id:  offer.vehicleId || null,
        price:       parseFloat(offer.price),
        notes:       offer.notes || null,
        status:      'pending',
      })
      if (!error) {
        setRequests(prev => prev.map(r => r.id === reqId ? { ...r, already_offered: true, offer_status: 'pending' } : r))
      }
    } catch (err) {
      console.error(err)
    }
    setSubmitting(null)
  }

  async function confirmDecline(reqId: string) {
    setDeclining(reqId)
    try {
      const { error } = await supabase.from('quote_declines').insert({
        request_id:  reqId,
        provider_id: providerId,
        comment:     declineComment.trim() || null,
      })
      if (!error) {
        setRequests(prev => prev.filter(r => r.id !== reqId))
      }
    } catch (err) {
      console.error(err)
    }
    setDeclining(null)
    setDeclineModal(null)
    setDeclineComment('')
  }

  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px', marginBottom:'10px' }
  const inp: React.CSSProperties = { fontSize:'14px', padding:'10px', backgroundColor:'#1e2530', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#f0ede6', outline:'none', colorScheme:'dark' as any }

  return (
    <div style={{padding:'20px'}}>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'4px'}}>Quote requests</h1>
      <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'20px'}}>Open requests from customers — submit your best price</p>

      {loading && (
        <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      )}

      {!loading && error && (
        <div style={{backgroundColor:'rgba(162,45,45,0.15)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'8px', padding:'20px', color:'#f09595', fontSize:'14px'}}>
          {error}
        </div>
      )}

      {!loading && !error && requests.length === 0 && (
        <div style={{...card, textAlign:'center', padding:'48px', color:'rgba(255,255,255,0.3)'}}>
          <div style={{fontSize:'32px', marginBottom:'12px'}}>📋</div>
          <p style={{fontSize:'15px', marginBottom:'6px', color:'rgba(255,255,255,0.5)'}}>No open quote requests right now</p>
          <p style={{fontSize:'13px'}}>When customers submit requests you will be notified by email and they will appear here.</p>
        </div>
      )}

      {!loading && !error && requests.map((req: any) => {
        const offer = offers[req.id] ?? { price:'', vehicleId:'', notes:'' }
        const dt = new Date(req.pickup_time)
        const canSubmit = offer.price && !req.already_offered && submitting !== req.id
        const offerExpired = req.offer_status === 'expired'

        return (
          <div key={req.id} style={card}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px', flexWrap:'wrap', gap:'8px'}}>
              <div>
                <div style={{fontSize:'16px', fontWeight:'500', marginBottom:'4px'}}>
                  {req.pickup?.name} → {req.dropoff?.name}
                </div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)'}}>
                  {dt.toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} · {dt.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})} · {req.passengers} passengers
                  {req.trip_type === 'return' && ' · Return'}
                  {req.flight_number && ` · ✈ ${req.flight_number}`}
                </div>
                {req.notes && <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'4px', fontStyle:'italic'}}>"{req.notes}"</div>}
              </div>
              <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>
                  Expires {new Date(req.expires_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}
                </div>
                {!req.already_offered && (
                  <button
                    onClick={() => { setDeclineModal(req.id); setDeclineComment('') }}
                    style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', background:'none', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'4px', padding:'4px 10px', cursor:'pointer', letterSpacing:'0.05em'}}>
                    Decline
                  </button>
                )}
              </div>
            </div>

            {offerExpired ? (
              <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px', padding:'12px', textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.4)'}}>
                ⌛ {req.offer_expiry_reason ?? 'Offer expired'}
              </div>
            ) : req.already_offered ? (
              <div style={{backgroundColor:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.2)', borderRadius:'6px', padding:'12px', textAlign:'center', fontSize:'13px', color:'#1D9E75'}}>
                ✓ Offer submitted — waiting for customer response
              </div>
            ) : (
              <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'12px', display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end'}}>
                <div style={{flex:'1', minWidth:'120px'}}>
                  <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px'}}>Your price (€) *</label>
                  <input type="number" placeholder="0.00" value={offer.price}
                    onChange={e => updateOffer(req.id, 'price', e.target.value)}
                    style={{...inp, width:'100%', boxSizing:'border-box'}} />
                </div>
                {vehicles.length > 0 && (
                  <div style={{flex:'2', minWidth:'180px'}}>
                    <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px'}}>Vehicle</label>
                    <select value={offer.vehicleId} onChange={e => updateOffer(req.id, 'vehicleId', e.target.value)}
                      style={{...inp, width:'100%', boxSizing:'border-box'}}>
                      <option value="">— select vehicle —</option>
                      {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.seats} seats)</option>)}
                    </select>
                  </div>
                )}
                <div style={{flex:'2', minWidth:'180px'}}>
                  <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px'}}>Note to customer</label>
                  <input type="text" placeholder="Optional message..." value={offer.notes}
                    onChange={e => updateOffer(req.id, 'notes', e.target.value)}
                    style={{...inp, width:'100%', boxSizing:'border-box'}} />
                </div>
                <button onClick={() => submitOffer(req.id)} disabled={!canSubmit}
                  style={{padding:'10px 20px', backgroundColor: canSubmit ? '#f4b942' : 'rgba(244,185,66,0.3)', color: canSubmit ? '#0f1419' : 'rgba(255,255,255,0.3)', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor: canSubmit ? 'pointer' : 'not-allowed', letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap'}}>
                  {submitting === req.id ? 'Submitting...' : 'Submit offer'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {declineModal && (
        <div style={{position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'20px'}}>
          <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'24px', maxWidth:'420px', width:'100%'}}>
            <h2 style={{fontSize:'16px', fontWeight:'500', marginBottom:'6px'}}>Decline this request?</h2>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'16px'}}>This request will be removed from your list. The customer will not be notified.</p>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px'}}>Reason (optional — internal only)</label>
            <textarea
              value={declineComment}
              onChange={e => setDeclineComment(e.target.value)}
              placeholder="e.g. date not available, route too far..."
              rows={3}
              style={{...inp, width:'100%', boxSizing:'border-box', resize:'none', marginBottom:'16px'}}
            />
            <div style={{display:'flex', gap:'10px'}}>
              <button
                onClick={() => { setDeclineModal(null); setDeclineComment('') }}
                style={{flex:1, padding:'11px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'13px', cursor:'pointer'}}>
                Cancel
              </button>
              <button
                onClick={() => confirmDecline(declineModal)}
                disabled={declining === declineModal}
                style={{flex:1, padding:'11px', backgroundColor:'rgba(162,45,45,0.8)', color:'#fff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer'}}>
                {declining === declineModal ? 'Declining...' : 'Yes, decline'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
