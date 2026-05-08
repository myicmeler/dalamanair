'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

export default function MyQuotes() {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string|null>(null)
  const [cancelling, setCancelling] = useState<string|null>(null)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [historyMap, setHistoryMap] = useState<Record<string, any[]>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin/?redirect=/quotes/'); return }
      const { data: reqs } = await supabase.from('quote_requests')
        .select(`*, 
          pickup:locations!pickup_location_id(name), 
          dropoff:locations!dropoff_location_id(name),
          quote_offers(*, provider:providers(company_name,phone), vehicle:vehicles(make,model,type,seats))`)
        .eq('customer_id', user.id)
        .order('created_at', { ascending: false })
      if (reqs) setRequests(reqs)
      setLoading(false)
    }
    load()
  }, [])

  async function loadHistory(requestId: string) {
    if (historyMap[requestId]) return
    const { data } = await supabase.from('quote_status_history')
      .select('*, changed_by_user:users(full_name)')
      .eq('quote_request_id', requestId)
      .order('created_at', { ascending: true })
    if (data) setHistoryMap(p => ({ ...p, [requestId]: data }))
  }

  async function handleExpand(requestId: string) {
    if (expanded === requestId) { setExpanded(null); return }
    setExpanded(requestId)
    await loadHistory(requestId)
  }

  async function acceptOffer(offerId: string, requestId: string, offer: any) {
    setAccepting(offerId)
    try {
      const req = requests.find(r => r.id === requestId)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('quote_offers').update({ status: 'accepted' }).eq('id', offerId)
      await supabase.from('quote_offers').update({ status: 'rejected' }).eq('request_id', requestId).neq('id', offerId)
      await supabase.from('quote_requests').update({ status: 'accepted' }).eq('id', requestId)
      // Log status change
      await supabase.from('quote_status_history').insert({
        quote_request_id: requestId, status: 'accepted',
        changed_by: user?.id, changed_by_role: 'customer',
        note: `Offer accepted from ${offer.provider?.company_name}`
      })
      await supabase.from('bookings').insert({
        customer_id: req.customer_id, provider_id: offer.provider_id, vehicle_id: offer.vehicle_id,
        pickup_location_id: req.pickup_location_id, dropoff_location_id: req.dropoff_location_id,
        direction: 'outbound', pickup_time: req.pickup_time, passengers: req.passengers,
        luggage: req.luggage, status: 'confirmed', price: offer.price,
        discount_pct: 0, final_price: offer.price,
        flight_number: req.flight_number, customer_notes: req.notes,
      })
      router.push('/bookings/')
    } catch (err) { console.error(err) }
    setAccepting(null)
  }

  async function cancelRequest(requestId: string, hasOffers: boolean) {
    if (!confirm(hasOffers ? 'Cancel this quote request? Providers who have submitted offers will be notified.' : 'Delete this quote request?')) return
    setCancelling(requestId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (hasOffers) {
        // Cancel — keep record, update status
        await supabase.from('quote_requests').update({ status: 'cancelled' }).eq('id', requestId)
        await supabase.from('quote_status_history').insert({
          quote_request_id: requestId, status: 'cancelled',
          changed_by: user?.id, changed_by_role: 'customer',
          note: 'Cancelled by customer'
        })
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'cancelled' } : r))
      } else {
        // Delete — no offers, safe to remove
        await supabase.from('quote_requests').delete().eq('id', requestId)
        setRequests(prev => prev.filter(r => r.id !== requestId))
      }
    } catch (err) { console.error(err) }
    setCancelling(null)
  }

  const card: React.CSSProperties = { backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden', marginBottom:'14px' }
  const statusColors: Record<string,{bg:string,color:string,label:string}> = {
    open:      { bg:'rgba(244,185,66,0.12)',  color:'#f4b942', label:'Open' },
    accepted:  { bg:'rgba(29,158,117,0.12)',  color:'#1D9E75', label:'Accepted' },
    expired:   { bg:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', label:'Expired' },
    cancelled: { bg:'rgba(162,45,45,0.12)',   color:'#f09595', label:'Cancelled' },
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'680px', margin:'0 auto', padding:'28px 16px 48px'}}>
        {/* Service notice */}
        <div style={{backgroundColor:'rgba(244,185,66,0.08)', border:'1px solid rgba(244,185,66,0.25)', borderLeft:'4px solid #f4b942', borderRadius:'6px', padding:'16px 20px', marginBottom:'24px'}}>
          <div style={{display:'flex', alignItems:'flex-start', gap:'12px'}}>
            <span style={{fontSize:'18px', flexShrink:0}}>⚠️</span>
            <div>
              <p style={{fontSize:'13px', fontWeight:'600', color:'#f4b942', margin:'0 0 6px', letterSpacing:'0.05em', textTransform:'uppercase'}}>Service notice</p>
              <p style={{fontSize:'13px', color:'rgba(255,255,255,0.7)', lineHeight:'1.7', margin:0}}>We are currently experiencing issues with our third-party email provider, which is affecting our ability to reach transfer providers and customers. You are welcome to create an account, but we kindly ask you to hold off on submitting quote requests until further notice. If you have already submitted a quote request, we will contact you personally as soon as possible. We apologise for the inconvenience and are working to resolve this quickly.</p>
            </div>
          </div>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px'}}>
          <div>
            <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'6px'}}>Your requests</p>
            <h1 style={{fontSize:'26px', fontWeight:'500', color:'#ffffff'}}>My quote requests</h1>
          </div>
          <a href="/quote/" style={{padding:'10px 18px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'12px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap'}}>+ New request</a>
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{...card, padding:'48px', textAlign:'center'}}>
            <p style={{fontSize:'15px', color:'rgba(255,255,255,0.4)', marginBottom:'16px'}}>No quote requests yet</p>
            <a href="/quote/" style={{padding:'12px 24px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'13px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>Request a quote →</a>
          </div>
        ) : requests.map((req:any) => {
          const s = statusColors[req.status] ?? statusColors.expired
          const hasOffers = (req.quote_offers?.length ?? 0) > 0
          const pendingOffers = req.quote_offers?.filter((o:any) => o.status === 'pending') ?? []
          const acceptedOffer = req.quote_offers?.find((o:any) => o.status === 'accepted')
          const isExpanded = expanded === req.id
          const history = historyMap[req.id] ?? []
          const canCancel = req.status === 'open'

          return (
            <div key={req.id} style={card}>
              <div style={{padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', cursor:'pointer'}} onClick={() => handleExpand(req.id)}>
                <div style={{flex:1}}>
                  <div style={{fontSize:'15px', fontWeight:'500', color:'#ffffff', marginBottom:'4px'}}>{req.pickup?.name} → {req.dropoff?.name}</div>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                    {new Date(req.pickup_time).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} · {new Date(req.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · {req.passengers} pax
                    {req.trip_type==='return'&&' · Return'}
                  </div>
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'8px', flexShrink:0}}>
                  <span style={{fontSize:'10px', padding:'3px 10px', borderRadius:'10px', backgroundColor:s.bg, color:s.color, fontWeight:'500'}}>{s.label}</span>
                  <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>{isExpanded?'▲':'▼'}</span>
                </div>
              </div>

              <div style={{padding:'14px 20px'}}>
                {req.status === 'open' && !hasOffers && (
                  <div style={{textAlign:'center', padding:'12px', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'6px', marginBottom:'12px'}}>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', margin:0}}>⏳ Waiting for providers — prices appear when offers arrive</p>
                  </div>
                )}

                {req.status === 'open' && pendingOffers.length > 0 && (
                  <div style={{display:'flex', flexDirection:'column', gap:'10px', marginBottom:'12px'}}>
                    <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', margin:'0 0 4px'}}>{pendingOffers.length} offer{pendingOffers.length>1?'s':''} received:</p>
                    {pendingOffers.map((offer:any) => (
                      <div key={offer.id} style={{border:'1px solid rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'14px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px'}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', marginBottom:'2px'}}>{offer.provider?.company_name??'—'}</div>
                          {offer.vehicle&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{offer.vehicle.make} {offer.vehicle.model} · {offer.vehicle.seats} seats</div>}
                          <div style={{fontSize:'11px', color:'#1D9E75', marginTop:'4px'}}>💵 Pay driver directly on transfer day</div>
                        </div>
                        <div style={{textAlign:'right', flexShrink:0}}>
                          <div style={{fontSize:'22px', fontWeight:'500', color:'#f4b942', marginBottom:'8px'}}>€ {offer.price?.toFixed(2)}</div>
                          <button onClick={() => acceptOffer(offer.id, req.id, offer)} disabled={accepting===offer.id}
                            style={{padding:'9px 18px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase'}}>
                            {accepting===offer.id?'Accepting...':'Accept →'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {acceptedOffer && (
                  <div style={{border:'1px solid rgba(244,185,66,0.3)', backgroundColor:'rgba(244,185,66,0.05)', borderRadius:'8px', padding:'14px', marginBottom:'12px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                      <div>
                        <div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', marginBottom:'2px'}}>{acceptedOffer.provider?.company_name}</div>
                        {acceptedOffer.vehicle&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{acceptedOffer.vehicle.make} {acceptedOffer.vehicle.model}</div>}
                      </div>
                      <div style={{fontSize:'20px', fontWeight:'500', color:'#f4b942'}}>€ {acceptedOffer.price?.toFixed(2)}</div>
                    </div>
                    <div style={{fontSize:'12px', color:'#1D9E75', padding:'8px 12px', backgroundColor:'rgba(29,158,117,0.08)', borderRadius:'5px'}}>
                      ✓ Booking confirmed · Pay your driver directly on transfer day
                    </div>
                  </div>
                )}

                {/* Status history */}
                {isExpanded && history.length > 0 && (
                  <div style={{marginBottom:'12px', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'12px'}}>
                    <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'10px'}}>Status history</p>
                    <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
                      {history.map((h:any) => (
                        <div key={h.id} style={{display:'flex', alignItems:'center', gap:'10px', fontSize:'12px'}}>
                          <div style={{width:'8px', height:'8px', borderRadius:'50%', backgroundColor:'#f4b942', flexShrink:0}} />
                          <span style={{color:'rgba(255,255,255,0.6)', textTransform:'capitalize', fontWeight:'500'}}>{h.status}</span>
                          <span style={{color:'rgba(255,255,255,0.3)'}}>by {h.changed_by_role}</span>
                          {h.note && <span style={{color:'rgba(255,255,255,0.25)', fontStyle:'italic'}}>— {h.note}</span>}
                          <span style={{color:'rgba(255,255,255,0.25)', marginLeft:'auto'}}>
                            {new Date(h.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} {new Date(h.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Cancel/Delete button */}
                {canCancel && (
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'12px', display:'flex', justifyContent:'flex-end'}}>
                    <button onClick={() => cancelRequest(req.id, hasOffers)} disabled={cancelling===req.id}
                      style={{padding:'7px 14px', background:'none', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'5px', color:'#f09595', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>
                      {cancelling===req.id ? 'Processing...' : hasOffers ? 'Cancel request' : 'Delete request'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
