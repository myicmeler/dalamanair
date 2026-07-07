'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'
import { callFunction } from '@/lib/functions'

export default function MyQuotes() {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState<string|null>(null)
  const [cancelling, setCancelling] = useState<string|null>(null)
  const [expanded, setExpanded] = useState<string|null>(null)
  const [historyMap, setHistoryMap] = useState<Record<string,any[]>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin/?redirect=/quotes/'); return }
      const { data: reqs } = await supabase.from('quote_requests')
        .select(`*,
          pickup:locations!pickup_location_id(name),
          dropoff:locations!dropoff_location_id(name),
          return_pickup:locations!quote_requests_return_pickup_location_id_fkey(name),
          return_dropoff:locations!quote_requests_return_dropoff_location_id_fkey(name),
          quote_offers(*, provider:providers(id,company_name,phone,user_id,tursab_number,description,user:users!user_id(email)), vehicle:vehicles(make,model,type,seats))`)
        .eq('customer_id', user.id).order('created_at', { ascending: false })
      if (reqs) setRequests(reqs)
      setLoading(false)
    }
    load()
  }, [])

  async function loadHistory(requestId: string) {
    if (historyMap[requestId]) return
    const { data } = await supabase.from('quote_status_history')
      .select('*').eq('quote_request_id', requestId).order('created_at', { ascending: true })
    if (data) setHistoryMap(p => ({ ...p, [requestId]: data }))
  }

  async function handleExpand(requestId: string) {
    if (expanded === requestId) { setExpanded(null); return }
    setExpanded(requestId); await loadHistory(requestId)
  }

  function currencySymbol(currency: string) {
    return currency === 'GBP' ? '£' : '€'
  }

  async function acceptOffer(offerId: string, requestId: string, offer: any) {
    setAccepting(offerId)
    try {
      const req = requests.find(r => r.id === requestId)
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('quote_offers').update({ status: 'accepted' }).eq('id', offerId)
      await supabase.from('quote_offers').update({ status: 'rejected' }).eq('request_id', requestId).neq('id', offerId)
      await supabase.from('quote_requests').update({ status: 'accepted' }).eq('id', requestId)
      await supabase.from('quote_status_history').insert({
        quote_request_id: requestId, status: 'accepted',
        changed_by: user?.id, changed_by_role: 'customer',
        note: `Offer accepted from ${offer.provider?.company_name}`
      })

      // --- NOTIFY REJECTED PROVIDERS ---
      const rejectedOffers = (req.quote_offers ?? []).filter((o: any) => o.id !== offerId)
      for (const rejected of rejectedOffers) {
        if (rejected.provider?.user_id) {
          // In-app notification
          await supabase.from('user_notifications').insert({
            user_id: rejected.provider.user_id,
            type: 'offer_not_selected',
            title: 'Your offer was not selected',
            body: `The customer chose another provider for ${req.pickup?.name} → ${req.dropoff?.name}. Better luck next time!`,
            link: '/provider/quotes/'
          })
          // Email notification
          try {
            await callFunction('send-email', {
              type: 'offer_not_selected',
              to: '',
              providerUserId: rejected.provider.user_id,
              data: {
                pickup: req.pickup?.name,
                dropoff: req.dropoff?.name,
                date: new Date(req.pickup_time).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
                price: rejected.price?.toFixed(2),
                currency: req.currency ?? 'EUR',
              }
            })
          } catch (e) { console.error('Rejected provider email error:', e) }
        }
      }
      // --- END NOTIFY REJECTED PROVIDERS ---

      const { data: booking } = await supabase.from('bookings').insert({
        customer_id: req.customer_id, provider_id: offer.provider_id, vehicle_id: offer.vehicle_id,
        pickup_location_id: req.pickup_location_id, dropoff_location_id: req.dropoff_location_id,
        direction: 'outbound', pickup_time: req.pickup_time, passengers: req.passengers,
        luggage: req.luggage, status: 'pending_provider_confirmation', price: offer.price,
        discount_pct: 0, final_price: offer.price,
        currency: req.currency ?? 'EUR',
        request_id: req.id,
        flight_number: req.flight_number, customer_notes: req.notes,
      }).select().single()
      if (booking) {
        await supabase.from('booking_status_history').insert({
          booking_id: booking.id, status: 'pending_provider_confirmation',
          changed_by: user?.id, changed_by_role: 'customer',
          note: 'Customer accepted offer — awaiting provider confirmation'
        })
        if (offer.provider?.user_id) {
          await supabase.from('user_notifications').insert({
            user_id: offer.provider.user_id, type: 'booking_pending_confirmation',
            title: 'Offer accepted — please confirm',
            body: `Customer accepted your offer for ${req.pickup?.name} → ${req.dropoff?.name}. Confirm to proceed.`,
            link: '/provider/bookings/'
          })
        }
        await supabase.from('user_notifications').insert({
          user_id: user?.id, type: 'booking_awaiting_provider',
          title: 'Offer accepted — waiting for provider',
          body: `${offer.provider?.company_name} will confirm shortly. You'll be notified.`,
          link: '/bookings/'
        })
        try {
          await callFunction('send-email', {
            type: 'offer_accepted_provider', to: '', providerUserId: offer.provider.user_id,
            data: {
              pickup: req.pickup?.name, dropoff: req.dropoff?.name,
              date: new Date(req.pickup_time).toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}),
              time: new Date(req.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}),
              price: offer.price.toFixed(2), currency: req.currency ?? 'EUR',
              passengers: req.passengers, flightNumber: req.flight_number, notes: req.notes,
            }
          })
        } catch (e) { console.error(e) }

        // --- RETURN LEG (bug fix, 2 Jul 2026) ---
        // For return trips, ALSO create the return booking row. Price is 0 on the
        // return row: the accepted offer price covers the round trip and sits on
        // the outbound row (Option A). The set_booking_group trigger links the
        // two rows by group_id automatically.
        if (req.trip_type === 'return' && req.return_time) {
          const { data: returnBooking } = await supabase.from('bookings').insert({
            customer_id: req.customer_id, provider_id: offer.provider_id, vehicle_id: offer.vehicle_id,
            pickup_location_id: req.return_pickup_location_id, dropoff_location_id: req.return_dropoff_location_id,
            direction: 'return', pickup_time: req.return_time,
            passengers: req.return_passengers ?? req.passengers,
            luggage: req.return_luggage ?? req.luggage,
            status: 'pending_provider_confirmation',
            price: 0, discount_pct: 0, final_price: 0,
            currency: req.currency ?? 'EUR',
            request_id: req.id,
            flight_number: req.return_flight_number, customer_notes: req.return_notes,
          }).select().single()
          if (returnBooking) {
            await supabase.from('booking_status_history').insert({
              booking_id: returnBooking.id, status: 'pending_provider_confirmation',
              changed_by: user?.id, changed_by_role: 'customer',
              note: 'Return leg — price included in outbound (round-trip offer)'
            })
          }
        }
        // --- END RETURN LEG ---
      }
      router.push('/bookings/')
    } catch (err) { console.error(err) }
    setAccepting(null)
  }

  async function cancelRequest(requestId: string, hasOffers: boolean) {
    if (!confirm(hasOffers ? 'Cancel this quote request? Providers who submitted offers will be notified.' : 'Delete this quote request?')) return
    setCancelling(requestId)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const req = requests.find(r => r.id === requestId)
      if (hasOffers) {
        await supabase.from('quote_requests').update({ status: 'cancelled' }).eq('id', requestId)
        await supabase.from('quote_status_history').insert({
          quote_request_id: requestId, status: 'cancelled',
          changed_by: user?.id, changed_by_role: 'customer', note: 'Cancelled by customer'
        })
        for (const offer of req.quote_offers || []) {
          if (offer.provider?.user_id) {
            await supabase.from('user_notifications').insert({
              user_id: offer.provider.user_id, type: 'request_cancelled',
              title: 'Quote request cancelled',
              body: `Customer cancelled the request for ${req.pickup?.name} → ${req.dropoff?.name}.`,
              link: '/provider/quotes/'
            })
          }
        }
        setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'cancelled' } : r))
      } else {
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
    cancelled: { bg:'rgba(162,45,45,0.12)',   color:'#f09595', label:'Cancelled by customer' },
  }

  function getExpiredMessage(requestId: string): string {
    const history = historyMap[requestId] ?? []
    const entry = history.find((h:any) => h.status === 'expired')
    if (entry?.note?.includes('less than 5 days')) return 'No offers received in time — transfer date was too close'
    if (entry?.note?.includes('passed')) return 'Transfer date has passed'
    return 'Request expired — no offers received'
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <style>{`* { box-sizing: border-box; }`}</style>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'680px', margin:'0 auto', padding:'24px 16px 48px'}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'20px', gap:'10px'}}>
          <div>
            <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'6px'}}>Your requests</p>
            <h1 style={{fontSize:'clamp(22px,5vw,26px)', fontWeight:'500', color:'#ffffff'}}>My quote requests</h1>
          </div>
          <a href="/quote/" style={{padding:'10px 16px', backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'6px', fontSize:'12px', fontWeight:'500', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase', whiteSpace:'nowrap'}}>+ New</a>
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
        ) : requests.length === 0 ? (
          <div style={{...card, padding:'48px 24px', textAlign:'center'}}>
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
          const isReturn = req.trip_type === 'return'
          const sym = currencySymbol(req.currency ?? 'EUR')

          return (
            <div key={req.id} style={card}>
              <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', cursor:'pointer'}} onClick={() => handleExpand(req.id)}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'6px'}}>
                  <div style={{fontSize:'15px', fontWeight:'500', color:'#ffffff', lineHeight:'1.3'}}>{req.pickup?.name} → {req.dropoff?.name}</div>
                  <div style={{display:'flex', alignItems:'center', gap:'8px', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end'}}>
                    {isReturn && <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:'rgba(244,185,66,0.1)', color:'#f4b942', fontWeight:'500'}}>↩ Return</span>}
                    <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.6)', fontWeight:'600'}}>{sym} {req.currency ?? 'EUR'}</span>
                    <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:s.bg, color:s.color, fontWeight:'500'}}>{s.label}</span>
                    <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>{isExpanded?'▲':'▼'}</span>
                  </div>
                </div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.45)', marginBottom:'2px'}}>
                  🛫 {new Date(req.pickup_time).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})} · {new Date(req.pickup_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})} · {req.passengers} pax · {req.luggage ?? 0} bags
                  {req.flight_number && ` · ✈ ${req.flight_number}`}
                </div>
                {req.notes && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', fontStyle:'italic', marginBottom:'2px'}}>"{req.notes}"</div>}
                {isReturn && req.return_time && (
                  <>
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', marginTop:'6px', marginBottom:'2px'}}>
                      ↩ {req.return_pickup?.name ?? '—'} → {req.return_dropoff?.name ?? '—'}
                    </div>
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', marginBottom:'2px'}}>
                      🛬 {new Date(req.return_time).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'})} · {new Date(req.return_time).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})} · {req.return_passengers ?? req.passengers} pax · {req.return_luggage ?? req.luggage ?? 0} bags
                      {req.return_flight_number && ` · ✈ ${req.return_flight_number}`}
                    </div>
                    {req.return_notes && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.25)', fontStyle:'italic'}}>"{req.return_notes}"</div>}
                  </>
                )}
              </div>

              <div style={{padding:'12px 16px'}}>
                {req.status === 'open' && !hasOffers && (
                  <div style={{textAlign:'center', padding:'12px', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'6px', marginBottom:'10px'}}>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', margin:0}}>⏳ Waiting for providers — prices appear when offers arrive</p>
                  </div>
                )}
                {req.status === 'open' && hasOffers && pendingOffers.length === 0 && !acceptedOffer && (
                  <div style={{textAlign:'center', padding:'12px', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'6px', marginBottom:'10px'}}>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.35)', margin:'0 0 8px'}}>⌛ No active offers — submit a new request if you still need a transfer.</p>
                    <a href="/quote/" style={{fontSize:'12px', color:'#f4b942', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>Submit a new request →</a>
                  </div>
                )}
                {req.status === 'expired' && (
                  <div style={{textAlign:'center', padding:'12px', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'6px', marginBottom:'10px'}}>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.35)', margin:'0 0 8px'}}>⌛ {getExpiredMessage(req.id)}</p>
                    <a href="/quote/" style={{fontSize:'12px', color:'#f4b942', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>Submit a new request →</a>
                  </div>
                )}
                {req.status === 'cancelled' && (
                  <div style={{textAlign:'center', padding:'12px', backgroundColor:'rgba(162,45,45,0.06)', borderRadius:'6px', marginBottom:'10px'}}>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.35)', margin:'0 0 8px'}}>🚫 This request was cancelled by you.</p>
                    <a href="/quote/" style={{fontSize:'12px', color:'#f4b942', textDecoration:'none', letterSpacing:'0.05em', textTransform:'uppercase'}}>Submit a new request →</a>
                  </div>
                )}
                {req.status === 'open' && pendingOffers.length > 0 && (
                  <div style={{display:'flex', flexDirection:'column', gap:'8px', marginBottom:'10px'}}>
                    <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', margin:'0 0 4px'}}>{pendingOffers.length} offer{pendingOffers.length>1?'s':''} received:</p>
                    {pendingOffers.map((offer:any) => (
                      <div key={offer.id} style={{border:'1px solid rgba(255,255,255,0.1)', backgroundColor:'rgba(255,255,255,0.04)', borderRadius:'8px', padding:'12px'}}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', marginBottom:'10px'}}>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontSize:'14px', fontWeight:'600', color:'#ffffff', marginBottom:'4px'}}>{offer.provider?.company_name??'—'}</div>
                            {offer.vehicle&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'6px'}}>{offer.vehicle.make} {offer.vehicle.model} · {offer.vehicle.seats} seats</div>}
                            <div style={{display:'flex', flexDirection:'column', gap:'3px', marginTop:'6px'}}>
                              {offer.provider?.phone&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.6)'}}>📞 <a href={`tel:${offer.provider.phone}`} style={{color:'rgba(255,255,255,0.8)', textDecoration:'none'}}>{offer.provider.phone}</a> · <a href={`https://wa.me/${offer.provider.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener" style={{color:'#25D366', textDecoration:'none', fontSize:'11px'}}>WhatsApp</a></div>}
                              {offer.provider?.user?.email&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.6)'}}>✉️ <a href={`mailto:${offer.provider.user.email}`} style={{color:'rgba(255,255,255,0.8)', textDecoration:'none'}}>{offer.provider.user.email}</a></div>}
                              <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>TURSAB: {offer.provider?.tursab_number || 'Not registered yet'}</div>
                            </div>
                          </div>
                          <div style={{fontSize:'20px', fontWeight:'600', color:'#f4b942', flexShrink:0}}>{sym} {offer.price?.toFixed(2)}</div>
                        </div>
                        {offer.notes&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', padding:'8px 10px', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'5px', marginBottom:'10px', fontStyle:'italic'}}>"{offer.notes}"</div>}
                        <button onClick={() => acceptOffer(offer.id, req.id, offer)} disabled={accepting===offer.id}
                          style={{width:'100%', padding:'10px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase'}}>
                          {accepting===offer.id?'Accepting...':'Accept this offer →'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {acceptedOffer && (
                  <div style={{border:'1px solid rgba(244,185,66,0.3)', backgroundColor:'rgba(244,185,66,0.05)', borderRadius:'8px', padding:'12px', marginBottom:'10px'}}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'10px'}}>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontSize:'14px', fontWeight:'600', color:'#ffffff', marginBottom:'4px'}}>{acceptedOffer.provider?.company_name}</div>
                        {acceptedOffer.vehicle&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'6px'}}>{acceptedOffer.vehicle.make} {acceptedOffer.vehicle.model}</div>}
                        <div style={{display:'flex', flexDirection:'column', gap:'3px'}}>
                          {acceptedOffer.provider?.phone&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.6)'}}>📞 <a href={`tel:${acceptedOffer.provider.phone}`} style={{color:'rgba(255,255,255,0.8)', textDecoration:'none'}}>{acceptedOffer.provider.phone}</a> · <a href={`https://wa.me/${acceptedOffer.provider.phone.replace(/[^0-9]/g,'')}`} target="_blank" rel="noopener" style={{color:'#25D366', textDecoration:'none', fontSize:'11px'}}>WhatsApp</a></div>}
                          {acceptedOffer.provider?.user?.email&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.6)'}}>✉️ <a href={`mailto:${acceptedOffer.provider.user.email}`} style={{color:'rgba(255,255,255,0.8)', textDecoration:'none'}}>{acceptedOffer.provider.user.email}</a></div>}
                          <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>TURSAB: {acceptedOffer.provider?.tursab_number || 'Not registered yet'}</div>
                        </div>
                      </div>
                      <div style={{fontSize:'18px', fontWeight:'600', color:'#f4b942', flexShrink:0}}>{sym} {acceptedOffer.price?.toFixed(2)}</div>
                    </div>
                    <div style={{fontSize:'12px', color:'#1D9E75', padding:'8px 12px', backgroundColor:'rgba(29,158,117,0.08)', borderRadius:'5px'}}>
                      ✓ Booking created · See <a href="/bookings/" style={{color:'#1D9E75', textDecoration:'underline'}}>My bookings</a> for confirmation status
                    </div>
                  </div>
                )}
                {isExpanded && history.length > 0 && (
                  <div style={{marginBottom:'10px', borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'10px'}}>
                    <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'8px'}}>Status history</p>
                    {history.map((h:any) => (
                      <div key={h.id} style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'12px', marginBottom:'4px', flexWrap:'wrap'}}>
                        <div style={{width:'6px', height:'6px', borderRadius:'50%', backgroundColor:'#f4b942', flexShrink:0}} />
                        <span style={{color:'rgba(255,255,255,0.6)', textTransform:'capitalize', fontWeight:'500'}}>{h.status}</span>
                        <span style={{color:'rgba(255,255,255,0.3)'}}>by {h.changed_by_role}</span>
                        {h.note && <span style={{color:'rgba(255,255,255,0.25)', fontStyle:'italic', fontSize:'11px'}}>— {h.note}</span>}
                      </div>
                    ))}
                  </div>
                )}
                {canCancel && (
                  <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:'10px', display:'flex', justifyContent:'flex-end'}}>
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
