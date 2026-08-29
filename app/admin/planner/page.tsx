'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const sym = (c?: string) => (c === 'GBP' ? '£' : '€')
const waDigits = (p?: string) => (p ?? '').replace(/[^0-9]/g, '')

// A transfer is "happening" if it is confirmed OR a driver has been assigned.
// driver_assigned is not a later, separate thing — it means confirmed AND a
// driver is allocated. Filtering on 'confirmed' alone would show an empty page:
// every live booking currently sits at driver_assigned.
const LIVE_STATUSES = ['confirmed', 'driver_assigned']

// Add days to a YYYY-MM-DD key, staying in UTC so the result matches the keys
// derived from pickup_time.
function addDays(key: string, n: number) {
  const d = new Date(key + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function AdminPlanner() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [providerFilter, setProviderFilter] = useState('all')
  // Date range as plain YYYY-MM-DD strings. Empty means "no limit" on that end,
  // so clearing `from` shows past transfers too. Defaults to today onwards.
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [toDate, setToDate] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const [{ data: bks }, { data: provs }] = await Promise.all([
      supabase.from('bookings')
        .select(`id, group_id, direction, pickup_time, passengers, luggage, status,
                 flight_number, customer_notes, final_price, currency, customer_phone, source,
                 manual_customer_name, manual_customer_phone,
                 customer:users!customer_id(full_name, phone),
                 provider:providers(id, company_name, phone),
                 driver:drivers(full_name, phone),
                 vehicle:vehicles(make, model, seats),
                 pickup:locations!pickup_location_id(name),
                 dropoff:locations!dropoff_location_id(name)`)
        .in('status', LIVE_STATUSES)
        .order('pickup_time', { ascending: true }),
      supabase.from('providers').select('id, company_name').order('company_name'),
    ])
    if (bks) setBookings(bks)
    if (provs) setProviders(provs)
    setLoading(false)
  }

  // pickup_time is stored and displayed exactly as entered (timeZone:'UTC'
  // everywhere), so the day key is the first 10 chars of the ISO string. ISO
  // dates sort and compare correctly as plain strings, which avoids any
  // timezone arithmetic here — and keeps the filter consistent with what is
  // shown on screen.
  const dayKey = (b: any) => String(b.pickup_time).slice(0, 10)

  const visible = bookings.filter(b => {
    if (providerFilter !== 'all' && b.provider?.id !== providerFilter) return false
    const key = dayKey(b)
    if (fromDate && key < fromDate) return false
    if (toDate && key > toDate) return false
    return true
  })

  // Group by calendar day.
  const byDay: Record<string, any[]> = {}
  for (const b of visible) {
    ;(byDay[dayKey(b)] ??= []).push(b)
  }
  const days = Object.keys(byDay).sort()

  const todayKey = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowKey = tomorrow.toISOString().slice(0, 10)

  function dayLabel(key: string) {
    const d = new Date(key + 'T00:00:00Z')
    const label = d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' })
    if (key === todayKey) return `Today · ${label}`
    if (key === tomorrowKey) return `Tomorrow · ${label}`
    return label
  }

  const upcomingCount = bookings.filter(b => dayKey(b) >= todayKey).length
  const todayCount = bookings.filter(b => dayKey(b) === todayKey).length
  const shownCount = visible.length

  const dateLbl: React.CSSProperties = { display:'block', fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'4px' }
  const dateInp: React.CSSProperties = { fontSize:'13px', padding:'7px 9px', backgroundColor:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#f0ede6', fontFamily:'inherit', outline:'none', colorScheme:'dark' as any }

  const card: React.CSSProperties = { backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'12px 14px', marginBottom:'8px' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'2px'}}>Planner</h1>
        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>
          Every confirmed transfer in pickup order. Return trips appear as two separate journeys, each on its own date.
        </p>
      </div>

      {/* Summary */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px'}}>
        {[
          { label:'Today', value: todayCount },
          { label:'Upcoming', value: upcomingCount },
          { label:'In this range', value: shownCount },
        ].map(s => (
          <div key={s.label} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
            <div style={{fontSize:'22px', fontWeight:'500', marginBottom:'4px'}}>{s.value}</div>
            <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{backgroundColor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'12px 14px', marginBottom:'16px'}}>
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end', marginBottom:'10px'}}>
          <div>
            <label style={dateLbl}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={dateInp} />
          </div>
          <div>
            <label style={dateLbl}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={dateInp} />
          </div>
          <div style={{flex:1, minWidth:'150px'}}>
            <label style={dateLbl}>Provider</label>
            <select value={providerFilter} onChange={e => setProviderFilter(e.target.value)}
              style={{...dateInp, width:'100%'}}>
              <option value="all">All providers</option>
              {providers.map(p => <option key={p.id} value={p.id}>{p.company_name}</option>)}
            </select>
          </div>
        </div>

        {/* Quick ranges. "All dates" clears both ends, which is how past
            transfers are shown — there is no separate past/future toggle. */}
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          {([
            ['Today',      todayKey, todayKey],
            ['Next 7 days', todayKey, addDays(todayKey, 7)],
            ['Next 30 days', todayKey, addDays(todayKey, 30)],
            ['Upcoming',   todayKey, ''],
            ['All dates',  '', ''],
          ] as [string,string,string][]).map(([label, f, tt]) => {
            const active = fromDate === f && toDate === tt
            return (
              <button key={label} onClick={() => { setFromDate(f); setToDate(tt) }} style={{
                padding:'5px 11px', borderRadius:'12px', fontSize:'11px', cursor:'pointer', background:'none',
                border:`1px solid ${active ? '#f4b942' : 'rgba(255,255,255,0.15)'}`,
                color: active ? '#f4b942' : 'rgba(255,255,255,0.4)', fontFamily:'inherit',
              }}>{label}</button>
            )
          })}
        </div>
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : days.length === 0 ? (
        <div style={{...card, textAlign:'center', padding:'48px', color:'rgba(255,255,255,0.35)'}}>
          <div style={{fontSize:'28px', marginBottom:'10px'}}>📅</div>
          <p style={{fontSize:'15px', margin:'0 0 4px', color:'rgba(255,255,255,0.5)'}}>Nothing scheduled</p>
          <p style={{fontSize:'13px', margin:0}}>
            No confirmed transfers in this date range. Try widening it, or press "All dates".
          </p>
        </div>
      ) : days.map(key => {
        const isToday = key === todayKey
        return (
          <div key={key} style={{marginBottom:'20px'}}>
            <div style={{
              display:'flex', alignItems:'center', gap:'10px', marginBottom:'8px',
              paddingBottom:'6px', borderBottom:`1px solid ${isToday ? 'rgba(244,185,66,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}>
              <span style={{fontSize:'13px', fontWeight:'600', color: isToday ? '#f4b942' : 'rgba(255,255,255,0.75)'}}>
                {dayLabel(key)}
              </span>
              <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginLeft:'auto'}}>
                {byDay[key].length} transfer{byDay[key].length === 1 ? '' : 's'}
              </span>
            </div>

            {byDay[key].map((b: any) => {
              const dt = new Date(b.pickup_time)
              // direction 'outbound' = airport → resort (an arrival for the traveller);
              // 'inbound' = resort → airport (a departure). The wording below is the
              // traveller's, since that is what the flight number refers to.
              const isArrival = b.direction === 'outbound'
              const isManual = b.source === 'manual'
              const custName = isManual ? (b.manual_customer_name || '—') : (b.customer?.full_name || '—')
              const custPhone = isManual
                ? (b.manual_customer_phone || b.customer_phone)
                : (b.customer_phone || b.customer?.phone)
              const wa = waDigits(custPhone)
              const isReturnLeg = !!b.group_id
              const noDriver = !b.driver

              return (
                <div key={b.id} style={card}>
                  <div style={{display:'flex', gap:'12px', alignItems:'flex-start', flexWrap:'wrap'}}>
                    {/* Time */}
                    <div style={{minWidth:'52px', flexShrink:0}}>
                      <div style={{fontSize:'17px', fontWeight:'600', color:'#f4b942', lineHeight:'1.1'}}>
                        {dt.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'UTC'})}
                      </div>
                      <div style={{fontSize:'9px', letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginTop:'2px'}}>
                        {isArrival ? '🛬 Arrival' : '🛫 Departure'}
                      </div>
                    </div>

                    {/* Journey */}
                    <div style={{flex:1, minWidth:'200px'}}>
                      <div style={{fontSize:'14px', fontWeight:'500', color:'#ffffff', marginBottom:'3px'}}>
                        {b.pickup?.name} → {b.dropoff?.name}
                      </div>
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.45)'}}>
                        {custName} · {b.passengers} pax
                        {b.flight_number ? ` · ✈ ${b.flight_number}` : ''}
                        {isReturnLeg ? ' · part of a return' : ''}
                      </div>
                      {custPhone && (
                        <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'5px', flexWrap:'wrap'}}>
                          <a href={`tel:${custPhone}`} style={{fontSize:'13px', fontWeight:'600', color:'rgba(255,255,255,0.75)', textDecoration:'none'}}>
                            📞 {custPhone}
                          </a>
                          <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                            style={{display:'inline-flex', alignItems:'center', fontSize:'10px', fontWeight:'600', padding:'2px 8px', borderRadius:'10px', backgroundColor:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.35)', color:'#25D366', textDecoration:'none'}}>
                            WhatsApp →
                          </a>
                        </div>
                      )}
                      {b.customer_notes && (
                        <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', fontStyle:'italic', marginTop:'4px'}}>"{b.customer_notes}"</div>
                      )}
                    </div>

                    {/* Provider / driver */}
                    <div style={{minWidth:'150px', textAlign:'right', flexShrink:0}}>
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.7)', fontWeight:'500'}}>{b.provider?.company_name ?? '—'}</div>
                      <div style={{fontSize:'11px', color: noDriver ? '#f09595' : 'rgba(255,255,255,0.4)', marginTop:'2px'}}>
                        {noDriver ? 'No driver assigned' : b.driver.full_name}
                      </div>
                      {b.driver?.phone && (
                        <a href={`tel:${b.driver.phone}`} style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', textDecoration:'none'}}>
                          {b.driver.phone}
                        </a>
                      )}
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginTop:'3px'}}>
                        {sym(b.currency)} {b.final_price?.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
