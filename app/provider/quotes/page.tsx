'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderQuotes() {
  const supabase = createClient() as any
  const [requests, setRequests] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [providerId, setProviderId] = useState('')
  const [submitting, setSubmitting] = useState<string|null>(null)
  const [offers, setOffers] = useState<Record<string, { price:string, vehicleId:string, notes:string }>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
      if (!provider) return
      setProviderId(provider.id)

      const { data: reqs } = await supabase
        .from('quote_requests')
        .select(`*,
          pickup:locations!pickup_location_id(name),
          dropoff:locations!dropoff_location_id(name)
        `)
        .eq('status', 'open')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending:false })

      if (reqs) {
        const { data: myOffers } = await supabase
          .from('quote_offers')
          .select('request_id, status')
          .eq('provider_id', provider.id)
          .in('request_id', reqs.map((r:any) => r.id))

        const offeredSet = new Set((myOffers??[]).map((o:any) => o.request_id))
        setRequests(reqs.map((r:any) => ({ ...r, already_offered: offeredSet.has(r.id) })))
      }

      const { data: vh } = await supabase.from('vehicles').select('*').eq('provider_id', provider.id).eq('is_active', true)
      if (vh) setVehicles(vh)
      setLoading(false)
    }
    load()
  }, [])

  function updateOffer(reqId: string, field: string, value: string) {
    setOffers(prev => ({ ...prev, [reqId]: { price:'', vehicleId:'', notes:'', ...prev[reqId], [field]: value } }))
  }

  async function submitOffer(reqId: string) {
    const offer = offers[reqId]
    if (!offer?.price || !offer?.vehicleId) return
    setSubmitting(reqId)
    try {
      await supabase.from('quote_offers').insert({
        request_id:  reqId,
        provider_id: providerId,
        vehicle_id:  offer.vehicleId,
        price:       parseFloat(offer.price),
        notes:       offer.notes || null,
        status:      'pending',
      })
      setRequests(prev => prev.map(r => r.id===reqId ? {...r, already_offered:true} : r))
    } catch (err) {
      console.error(err)
    }
    setSubmitting(null)
  }

  const inputStyle = { width:'100%', fontSize:'14px', padding:'11px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6', marginTop:'4px' }
  const labelStyle = { fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)' }

  return (
    <div style={{padding:'16px'}}>
      <div style={{marginBottom:'20px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'4px'}}>Quote requests</h1>
        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)'}}>Open requests from customers — submit your best price</p>
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : requests.length === 0 ? (
        <div style={{textAlign:'center', padding:'48px', color:'rgba(255,255,255,0.3)', fontSize:'14px'}}>
          No open quote requests right now
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'14px'}}>
          {requests.map((req:any) => (
            <div key={req.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden'}}>
              {/* Request info */}
              <div style={{padding:'16px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                  <div style={{fontSize:'15px', fontWeight:'500'}}>{req.pickup?.name} → {req.dropoff?.name}</div>
                  {req.already_offered && (
                    <span style={{fontSize:'10px', padding:'3px 10px', borderRadius:'10px', backgroundColor:'rgba(29,158,117,0.15)', color:'#1D9E75', flexShrink:0, marginLeft:'8px'}}>Offer sent</span>
                  )}
                </div>
                <div style={{display:'flex', gap:'16px', flexWrap:'wrap', fontSize:'12px', color:'rgba(255,255,255,0.5)'}}>
                  <span>{new Date(req.pickup_time).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}</span>
                  <span>{new Date(req.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}</span>
                  <span>{req.passengers} passengers</span>
                  <span>{req.luggage} bags</span>
                  {req.trip_type === 'return' && <span>Return trip</span>}
                </div>
                {req.flight_number && (
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'4px'}}>Flight: {req.flight_number}</div>
                )}
                {req.notes && (
                  <div style={{fontSize:'12px', color:'#f4b942', marginTop:'6px', padding:'8px 10px', backgroundColor:'rgba(244,185,66,0.08)', borderRadius:'5px', borderLeft:'2px solid #f4b942'}}>
                    📝 {req.notes}
                  </div>
                )}
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'8px'}}>
                  Expires {new Date(req.expires_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})} at {new Date(req.expires_at).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}
                </div>
              </div>

              {/* Offer form */}
              {!req.already_offered && (
                <div style={{padding:'16px'}}>
                  <p style={{fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'12px'}}>Your offer</p>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                    <div>
                      <label style={labelStyle}>Your price (€) *</label>
                      <input type="number" min="0" step="0.01"
                        value={offers[req.id]?.price??''} onChange={e => updateOffer(req.id, 'price', e.target.value)}
                        placeholder="45.00" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Vehicle *</label>
                      <select value={offers[req.id]?.vehicleId??''} onChange={e => updateOffer(req.id, 'vehicleId', e.target.value)} style={inputStyle}>
                        <option value="">Select vehicle</option>
                        {vehicles.filter(v => v.seats >= req.passengers).map((v:any) => (
                          <option key={v.id} value={v.id}>{v.make} {v.model} ({v.seats} seats)</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div style={{marginBottom:'12px'}}>
                    <label style={labelStyle}>Message to customer (optional)</label>
                    <input type="text" value={offers[req.id]?.notes??''} onChange={e => updateOffer(req.id, 'notes', e.target.value)}
                      placeholder="Includes meet & greet, flight tracking..." style={inputStyle} />
                  </div>
                  <button onClick={() => submitOffer(req.id)}
                    disabled={submitting===req.id || !offers[req.id]?.price || !offers[req.id]?.vehicleId}
                    style={{width:'100%', padding:'12px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase',
                      opacity:(!offers[req.id]?.price||!offers[req.id]?.vehicleId)?0.4:1}}>
                    {submitting===req.id ? 'Sending...' : 'Send offer →'}
                  </button>
                </div>
              )}

              {req.already_offered && (
                <div style={{padding:'14px 16px', display:'flex', alignItems:'center', gap:'8px'}}>
                  <span style={{fontSize:'16px'}}>✓</span>
                  <span style={{fontSize:'13px', color:'rgba(255,255,255,0.5)'}}>Your offer has been sent. You will be notified if the customer accepts.</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
