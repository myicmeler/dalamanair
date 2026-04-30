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
      if (!user) { router.push('/auth/signin/?redirect=/quotes/'); return }
      const { data: reqs } = await supabase.from('quote_requests')
        .select(`*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name),
          quote_offers(*, provider:providers(company_name,phone), vehicle:vehicles(make,model,type,seats))`)
        .eq('customer_id', user.id).order('created_at', { ascending:false })
      if (reqs) setRequests(reqs)
      setLoading(false)
    }
    load()
  }, [])

  async function acceptOffer(offerId: string, requestId: string, offer: any) {
    setAccepting(offerId)
    try {
      const req = requests.find(r => r.id === requestId)
      await supabase.from('quote_offers').update({ status:'accepted' }).eq('id', offerId)
      await supabase.from('quote_offers').update({ status:'rejected' }).eq('request_id', requestId).neq('id', offerId)
      await supabase.from('quote_requests').update({ status:'accepted' }).eq('id', requestId)
      await supabase.from('bookings').insert({
        customer_id: req.customer_id, provider_id: offer.provider_id, vehicle_id: offer.vehicle_id,
        pickup_location_id: req.pickup_location_id, dropoff_location_id: req.dropoff_location_id,
        direction:'outbound', pickup_time: req.pickup_time, passengers: req.passengers, luggage: req.luggage,
        status:'confirmed', price: offer.price, discount_pct:0, final_price: offer.price,
        flight_number: req.flight_number, customer_notes: req.notes,
      })
      router.push('/bookings/')
    } catch(err) { console.error(err) }
    setAccepting(null)
  }

  const card = { backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', overflow:'hidden', marginBottom:'14px' }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'680px', margin:'0 auto', padding:'28px 16px 48px'}}>
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
          const hasOffers = req.quote_offers?.length > 0
          const pendingOffers = req.quote_offers?.filter((o:any) => o.status==='pending') ?? []
          const acceptedOffer = req.quote_offers?.find((o:any) => o.status==='accepted')
          const statusMap: Record<string,{bg:string,color:string,label:string}> = {
            open:     {bg:'rgba(244,185,66,0.12)', color:'#f4b942', label:'Open'},
            accepted: {bg:'rgba(29,158,117,0.12)', color:'#1D9E75', label:'Accepted'},
            expired:  {bg:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', label:'Expired'},
          }
          const s = statusMap[req.status] ?? statusMap.expired

          return (
            <div key={req.id} style={card}>
              <div style={{padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                <div>
                  <div style={{fontSize:'15px', fontWeight:'500', color:'#ffffff', marginBottom:'4px'}}>{req.pickup?.name} → {req.dropoff?.name}</div>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                    {new Date(req.pickup_time).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})} · {new Date(req.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})} · {req.passengers} pax
                    {req.trip_type==='return'&&' · Return'}
                  </div>
                </div>
                <span style={{fontSize:'10px', padding:'3px 10px', borderRadius:'10px', backgroundColor:s.bg, color:s.color, fontWeight:'500'}}>{s.label}</span>
              </div>
              <div style={{padding:'14px 20px'}}>
                {req.status==='open' && !hasOffers && (
                  <div style={{textAlign:'center', padding:'12px', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'6px'}}>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', margin:0}}>⏳ Waiting for providers — prices appear here when offers arrive</p>
                  </div>
                )}
                {req.status==='open' && pendingOffers.length > 0 && (
                  <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                    <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', margin:'0 0 8px'}}>{pendingOffers.length} offer{pendingOffers.length>1?'s':''} received:</p>
                    {pendingOffers.map((offer:any) => (
                      <div key={offer.id} style={{border:'1px solid rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'14px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px'}}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', marginBottom:'2px'}}>{offer.provider?.company_name??'—'}</div>
                          {offer.vehicle&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{offer.vehicle.make} {offer.vehicle.model} · {offer.vehicle.seats} seats</div>}
                          {offer.notes&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', fontStyle:'italic', marginTop:'2px'}}>"{offer.notes}"</div>}
                          <div style={{fontSize:'11px', color:'#1D9E75', marginTop:'6px'}}>💵 Pay driver directly on transfer day</div>
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
                  <div style={{border:'1px solid rgba(244,185,66,0.3)', backgroundColor:'rgba(244,185,66,0.05)', borderRadius:'8px', padding:'14px'}}>
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
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
