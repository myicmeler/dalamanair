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

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin?redirect=/quotes'); return }

      const { data: reqs } = await supabase
        .from('quote_requests')
        .select(`*, 
          pickup:locations!pickup_location_id(name), 
          dropoff:locations!dropoff_location_id(name),
          quote_offers(*, provider:providers(company_name), vehicle:vehicles(make, model, type, seats))
        `)
        .eq('customer_id', user.id)
        .order('created_at', { ascending:false })

      if (reqs) setRequests(reqs)
      setLoading(false)
    }
    load()
  }, [])

  async function acceptOffer(offerId: string, requestId: string, offer: any) {
    setAccepting(offerId)
    try {
      await supabase.from('quote_offers').update({ status:'accepted' }).eq('id', offerId)
      await supabase.from('quote_offers').update({ status:'rejected' }).eq('request_id', requestId).neq('id', offerId)
      await supabase.from('quote_requests').update({ status:'accepted' }).eq('id', requestId)

      const req = requests.find(r => r.id === requestId)
      await supabase.from('bookings').insert({
        customer_id:          req.customer_id,
        provider_id:          offer.provider_id,
        vehicle_id:           offer.vehicle_id,
        pickup_location_id:   req.pickup_location_id,
        dropoff_location_id:  req.dropoff_location_id,
        direction:            'outbound',
        pickup_time:          req.pickup_time,
        passengers:           req.passengers,
        luggage:              req.luggage,
        status:               'confirmed',
        price:                offer.price,
        discount_pct:         0,
        final_price:          offer.price,
        flight_number:        req.flight_number,
        customer_notes:       req.notes,
      })

      setRequests(prev => prev.map(r => r.id === requestId
        ? { ...r, status:'accepted', quote_offers: r.quote_offers.map((o:any) =>
            ({ ...o, status: o.id===offerId?'accepted':'rejected' })) }
        : r
      ))

      router.push('/bookings')
    } catch (err) {
      console.error(err)
    }
    setAccepting(null)
  }

  const statusBadge = (status: string) => {
    const map: Record<string,{bg:string,color:string,label:string}> = {
      open:     { bg:'rgba(244,185,66,0.12)', color:'#e0a528', label:'Open' },
      accepted: { bg:'rgba(29,158,117,0.12)', color:'#1D9E75', label:'Accepted' },
      expired:  { bg:'rgba(255,255,255,0.06)', color:'#8a8680', label:'Expired' },
      cancelled:{ bg:'rgba(162,45,45,0.12)', color:'#f09595', label:'Cancelled' },
    }
    const s = map[status] ?? map.expired
    return <span style={{fontSize:'10px', padding:'3px 10px', borderRadius:'10px', backgroundColor:s.bg, color:s.color, fontWeight:'500'}}>{s.label}</span>
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'680px', margin:'0 auto', padding:'28px 16px 48px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'24px'}}>
          <div>
            <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'6px'}}>Your requests</p>
            <h1 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419'}}>My quote requests</h1>
          </div>
          <a href="/quote" style={{padding:'10px 18px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'12px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap'}}>
            + New request
          </a>
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'60px', color:'#8a8680'}}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'10px', padding:'48px', textAlign:'center'}}>
            <p style={{fontSize:'15px', color:'#8a8680', marginBottom:'16px'}}>No quote requests yet</p>
            <a href="/quote" style={{padding:'12px 24px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'13px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>
              Request a quote →
            </a>
          </div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
            {requests.map((req:any) => (
              <div key={req.id} style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'10px', overflow:'hidden'}}>
                {/* Request header */}
                <div style={{padding:'16px 20px', borderBottom:'1px solid #f5f2ea', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                  <div>
                    <div style={{fontSize:'15px', fontWeight:'500', color:'#0f1419', marginBottom:'4px'}}>
                      {req.pickup?.name} → {req.dropoff?.name}
                    </div>
                    <div style={{fontSize:'12px', color:'#8a8680'}}>
                      {new Date(req.pickup_time).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})} · {new Date(req.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})} · {req.passengers} pax
                      {req.trip_type === 'return' && ' · Return'}
                    </div>
                  </div>
                  {statusBadge(req.status)}
                </div>

                {/* Offers */}
                <div style={{padding:'12px 20px'}}>
                  {req.status === 'open' && (
                    <div style={{fontSize:'12px', color:'#8a8680', marginBottom: req.quote_offers?.length > 0 ? '12px' : '0'}}>
                      {req.quote_offers?.length > 0
                        ? `${req.quote_offers.length} offer${req.quote_offers.length > 1 ? 's' : ''} received`
                        : 'Waiting for offers from providers...'}
                    </div>
                  )}

                  {req.quote_offers?.length > 0 && (
                    <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                      {req.quote_offers
                        .filter((o:any) => req.status === 'accepted' ? o.status === 'accepted' : true)
                        .sort((a:any, b:any) => a.price - b.price)
                        .map((offer:any) => (
                          <div key={offer.id} style={{
                            border:`1px solid ${offer.status==='accepted'?'#f4b942':'#e5e3dd'}`,
                            backgroundColor: offer.status==='accepted'?'rgba(244,185,66,0.05)':'#faf8f3',
                            borderRadius:'8px', padding:'14px',
                            display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px'
                          }}>
                            <div style={{flex:1, minWidth:0}}>
                              <div style={{fontSize:'13px', fontWeight:'500', color:'#0f1419', marginBottom:'2px'}}>
                                {offer.provider?.company_name ?? '—'}
                              </div>
                              {offer.vehicle && (
                                <div style={{fontSize:'12px', color:'#8a8680', marginBottom:'2px'}}>
                                  {offer.vehicle.make} {offer.vehicle.model} · {offer.vehicle.seats} seats
                                </div>
                              )}
                              {offer.notes && (
                                <div style={{fontSize:'12px', color:'#8a8680', fontStyle:'italic'}}>"{offer.notes}"</div>
                              )}
                            </div>
                            <div style={{textAlign:'right', flexShrink:0}}>
                              <div style={{fontSize:'20px', fontWeight:'500', color:'#0f1419', marginBottom:'6px'}}>
                                € {offer.price.toFixed(2)}
                              </div>
                              {req.status === 'open' && offer.status === 'pending' && (
                                <button onClick={() => acceptOffer(offer.id, req.id, offer)}
                                  disabled={accepting === offer.id}
                                  style={{padding:'8px 16px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'500', cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase'}}>
                                  {accepting === offer.id ? 'Accepting...' : 'Accept →'}
                                </button>
                              )}
                              {offer.status === 'accepted' && (
                                <span style={{fontSize:'11px', color:'#1D9E75', fontWeight:'500'}}>✓ Accepted</span>
                              )}
                              {offer.status === 'rejected' && (
                                <span style={{fontSize:'11px', color:'#8a8680'}}>Not selected</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {req.status === 'open' && (
                    <div style={{marginTop:'12px', fontSize:'11px', color:'#8a8680'}}>
                      Expires {new Date(req.expires_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})} at {new Date(req.expires_at).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'})}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
