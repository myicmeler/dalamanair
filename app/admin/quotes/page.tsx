'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminQuotes() {
  const supabase = createClient() as any
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'open'|'accepted'|'expired'>('all')
  const [pushing, setPushing] = useState<string|null>(null)
  const [pushLog, setPushLog] = useState<Record<string, { sent: number, time: string }>>({})
  const [expanded, setExpanded] = useState<string|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('quote_requests')
      .select(`*,
        pickup:locations!pickup_location_id(name),
        dropoff:locations!dropoff_location_id(name),
        customer:users!customer_id(email, full_name),
        quote_offers(*, provider:providers(company_name), vehicle:vehicles(make,model,seats))
      `)
      .order('created_at', { ascending: false })
    if (data) setRequests(data)
    setLoading(false)
  }

  async function pushToProviders(requestId: string) {
    setPushing(requestId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/notify-providers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ requestId }),
      })
      const result = await res.json()
      setPushLog(prev => ({
        ...prev,
        [requestId]: {
          sent: result.sent ?? 0,
          time: new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' }),
        }
      }))
    } catch (err) {
      console.error(err)
    }
    setPushing(null)
  }

  function exportCSV() {
    const rows = [
      ['Request ID', 'Customer', 'Email', 'From', 'To', 'Date', 'Time', 'Passengers', 'Trip Type', 'Flight', 'Status', 'Offers received', 'Lowest offer (€)', 'Accepted offer (€)', 'Created at']
    ]
    requests.forEach(req => {
      const offers = req.quote_offers ?? []
      const prices = offers.map((o:any) => o.price).filter(Boolean)
      const lowest = prices.length ? Math.min(...prices).toFixed(2) : ''
      const accepted = offers.find((o:any) => o.status === 'accepted')
      rows.push([
        req.id,
        req.customer?.full_name ?? '',
        req.customer?.email ?? '',
        req.pickup?.name ?? '',
        req.dropoff?.name ?? '',
        new Date(req.pickup_time).toLocaleDateString('en-GB'),
        new Date(req.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit'}),
        req.passengers,
        req.trip_type,
        req.flight_number ?? '',
        req.status,
        offers.length,
        lowest,
        accepted ? accepted.price.toFixed(2) : '',
        new Date(req.created_at).toLocaleDateString('en-GB'),
      ])
    })
    const csv = rows.map(r => r.map(String).map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `dalaman-quotes-${new Date().toISOString().slice(0,10)}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)

  const statusColors: Record<string,{bg:string,color:string}> = {
    open:      { bg:'rgba(244,185,66,0.12)',  color:'#f4b942' },
    accepted:  { bg:'rgba(29,158,117,0.12)',  color:'#1D9E75' },
    expired:   { bg:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.35)' },
    cancelled: { bg:'rgba(162,45,45,0.12)',   color:'#f09595' },
  }

  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', marginBottom:'10px', overflow:'hidden' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <div>
          <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'2px'}}>Quote requests</h1>
          <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>All customer quote requests · push to providers · export CSV</p>
        </div>
        <button onClick={exportCSV} style={{padding:'9px 16px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.7)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>
          ↓ Export CSV
        </button>
      </div>

      {/* Stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'10px', marginBottom:'16px'}}>
        {[
          { label:'Total requests', value: requests.length },
          { label:'Open', value: requests.filter(r => r.status==='open').length },
          { label:'Accepted', value: requests.filter(r => r.status==='accepted').length },
          { label:'Total offers', value: requests.reduce((s,r) => s + (r.quote_offers?.length ?? 0), 0) },
        ].map(s => (
          <div key={s.label} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
            <div style={{fontSize:'22px', fontWeight:'500', marginBottom:'4px'}}>{s.value}</div>
            <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{display:'flex', gap:'6px', marginBottom:'14px', flexWrap:'wrap'}}>
        {(['all','open','accepted','expired'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 14px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', background:'none', textTransform:'capitalize',
            borderColor: filter===f?'#f4b942':'rgba(255,255,255,0.15)',
            color: filter===f?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{...card, padding:'40px', textAlign:'center', color:'rgba(255,255,255,0.3)'}}>No quote requests</div>
      ) : filtered.map((req:any) => {
        const s = statusColors[req.status] ?? statusColors.expired
        const offers = req.quote_offers ?? []
        const acceptedOffer = offers.find((o:any) => o.status === 'accepted')
        const isExpanded = expanded === req.id
        const log = pushLog[req.id]

        return (
          <div key={req.id} style={card}>
            {/* Header row */}
            <div style={{padding:'14px 16px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px', cursor:'pointer'}} onClick={() => setExpanded(isExpanded ? null : req.id)}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px', flexWrap:'wrap'}}>
                  <span style={{fontSize:'15px', fontWeight:'500'}}>{req.pickup?.name} → {req.dropoff?.name}</span>
                  <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'8px', backgroundColor:s.bg, color:s.color, fontWeight:'500', textTransform:'capitalize'}}>{req.status}</span>
                </div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {new Date(req.pickup_time).toLocaleDateString('en-GB', {day:'2-digit',month:'short',year:'numeric'})}
                  {' · '}{new Date(req.pickup_time).toLocaleTimeString('en-GB', {hour:'2-digit',minute:'2-digit'})}
                  {' · '}{req.passengers} pax
                  {req.trip_type==='return'&&' · Return'}
                  {req.flight_number&&` · ✈ ${req.flight_number}`}
                </div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', marginTop:'2px'}}>
                  {req.customer?.full_name||'—'} · {req.customer?.email||'—'}
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', alignItems:'flex-end', gap:'6px', flexShrink:0}}>
                <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
                  {offers.length} offer{offers.length!==1?'s':''}
                </span>
                {acceptedOffer && (
                  <span style={{fontSize:'13px', fontWeight:'500', color:'#1D9E75'}}>€ {acceptedOffer.price?.toFixed(2)} accepted</span>
                )}
                <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>{isExpanded?'▲':'▼'}</span>
              </div>
            </div>

            {/* Expanded detail */}
            {isExpanded && (
              <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'14px 16px'}}>

                {/* Offers */}
                {offers.length > 0 ? (
                  <div style={{marginBottom:'14px'}}>
                    <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'8px'}}>Offers received</p>
                    <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                      {offers.map((offer:any) => {
                        const offerStatus: Record<string,{bg:string,color:string}> = {
                          pending:  { bg:'rgba(244,185,66,0.1)', color:'#f4b942' },
                          accepted: { bg:'rgba(29,158,117,0.1)', color:'#1D9E75' },
                          rejected: { bg:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.3)' },
                        }
                        const os = offerStatus[offer.status] ?? offerStatus.pending
                        return (
                          <div key={offer.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.06)'}}>
                            <div>
                              <div style={{fontSize:'13px', fontWeight:'500', marginBottom:'2px'}}>{offer.provider?.company_name??'—'}</div>
                              {offer.vehicle&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{offer.vehicle.make} {offer.vehicle.model} · {offer.vehicle.seats} seats</div>}
                              {offer.notes&&<div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', fontStyle:'italic'}}>"{offer.notes}"</div>}
                            </div>
                            <div style={{display:'flex', alignItems:'center', gap:'10px', flexShrink:0}}>
                              <span style={{fontSize:'16px', fontWeight:'500', color:'#f4b942'}}>€ {offer.price?.toFixed(2)}</span>
                              <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'8px', backgroundColor:os.bg, color:os.color, fontWeight:'500', textTransform:'capitalize'}}>{offer.status}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div style={{marginBottom:'14px', padding:'12px', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'6px', textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.35)'}}>
                    No offers yet
                  </div>
                )}

                {/* Notes */}
                {req.notes && (
                  <div style={{marginBottom:'14px', padding:'10px 12px', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'6px'}}>
                    <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'4px'}}>Customer notes</p>
                    <p style={{fontSize:'13px', color:'rgba(255,255,255,0.6)', margin:0}}>"{req.notes}"</p>
                  </div>
                )}

                {/* Push to providers */}
                <div style={{display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap'}}>
                  <button
                    onClick={() => pushToProviders(req.id)}
                    disabled={pushing === req.id}
                    style={{padding:'9px 16px', backgroundColor:pushing===req.id?'rgba(244,185,66,0.3)':'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:pushing===req.id?'not-allowed':'pointer', fontFamily:'inherit', letterSpacing:'0.05em', textTransform:'uppercase'}}
                  >
                    {pushing===req.id?'Sending...':'📨 Push to providers'}
                  </button>
                  {log && (
                    <span style={{fontSize:'12px', color:'#1D9E75'}}>
                      ✓ Sent to {log.sent} provider{log.sent!==1?'s':''} at {log.time}
                    </span>
                  )}
                  <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>
                    Re-sends notification email to all approved providers
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
