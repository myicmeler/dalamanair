'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { useProviderLang } from '@/lib/providerText'

const sym = (c?: string) => (c === 'GBP' ? '£' : '€')
const waDigits = (p?: string) => (p ?? '').replace(/[^0-9]/g, '')

// A transfer is "happening" if it is confirmed OR a driver has been assigned.
// driver_assigned is not a later, separate state — it means confirmed AND a
// driver is allocated. Filtering on 'confirmed' alone shows an empty page.
const LIVE_STATUSES = ['confirmed', 'driver_assigned']

// Add days to a YYYY-MM-DD key, staying in UTC so the result matches the keys
// derived from pickup_time.
function addDays(key: string, n: number) {
  const d = new Date(key + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export default function ProviderPlanner() {
  const router = useRouter()
  const supabase = createClient() as any
  const { t } = useProviderLang()
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [toDate, setToDate] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/signin?redirect=/provider/planner'); return }
    const { data: prov } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
    if (!prov) { router.push('/'); return }

    // Scoped to this provider explicitly. RLS already restricts rows, but an
    // explicit filter means the query cannot silently widen if a policy changes.
    const { data } = await supabase.from('bookings')
      .select(`id, group_id, direction, pickup_time, passengers, luggage, status,
               flight_number, customer_notes, final_price, currency, customer_phone, source,
               manual_customer_name, manual_customer_phone,
               customer:users!customer_id(full_name, phone),
               driver:drivers(full_name, phone),
               vehicle:vehicles(make, model, seats),
               pickup:locations!pickup_location_id(name),
               dropoff:locations!dropoff_location_id(name)`)
      .eq('provider_id', prov.id)
      .in('status', LIVE_STATUSES)
      .order('pickup_time', { ascending: true })

    if (data) setBookings(data)
    setLoading(false)
  }

  // pickup_time is shown exactly as entered (timeZone:'UTC' everywhere), so the
  // day key is the first 10 chars of the ISO string. ISO dates compare and sort
  // correctly as plain strings — no timezone arithmetic, and the filter matches
  // what is on screen.
  const dayKey = (b: any) => String(b.pickup_time).slice(0, 10)

  const visible = bookings.filter(b => {
    const key = dayKey(b)
    if (fromDate && key < fromDate) return false
    if (toDate && key > toDate) return false
    return true
  })

  const byDay: Record<string, any[]> = {}
  for (const b of visible) {
    ;(byDay[dayKey(b)] ??= []).push(b)
  }
  const days = Object.keys(byDay).sort()

  const todayKey = new Date().toISOString().slice(0, 10)
  const tomorrowKey = addDays(todayKey, 1)

  function dayLabel(key: string) {
    const d = new Date(key + 'T00:00:00Z')
    const label = d.toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'UTC' })
    if (key === todayKey) return `${t.today} · ${label}`
    if (key === tomorrowKey) return `${t.tomorrow} · ${label}`
    return label
  }

  const upcomingCount = bookings.filter(b => dayKey(b) >= todayKey).length
  const todayCount = bookings.filter(b => dayKey(b) === todayKey).length

  const lbl: React.CSSProperties = { display:'block', fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'4px' }
  const inp: React.CSSProperties = { fontSize:'13px', padding:'7px 9px', backgroundColor:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#f0ede6', fontFamily:'inherit', outline:'none', colorScheme:'dark' as any }
  const card: React.CSSProperties = { backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'12px 14px', marginBottom:'8px' }

  return (
    <div style={{padding:'20px 16px 80px', maxWidth:'820px', margin:'0 auto'}}>
      <div style={{marginBottom:'16px'}}>
        <h1 style={{fontSize:'clamp(20px,5vw,24px)', fontWeight:'500', color:'#ffffff', marginBottom:'4px'}}>{t.planner}</h1>
        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', lineHeight:'1.6'}}>{t.plannerSub}</p>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'16px'}}>
        {[
          { label:t.today, value: todayCount },
          { label:t.upcoming, value: upcomingCount },
          { label:t.inThisRange, value: visible.length },
        ].map(s => (
          <div key={s.label} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
            <div style={{fontSize:'22px', fontWeight:'500', marginBottom:'4px'}}>{s.value}</div>
            <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{backgroundColor:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'12px 14px', marginBottom:'16px'}}>
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end', marginBottom:'10px'}}>
          <div>
            <label style={lbl}>{t.from}</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>{t.to}</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inp} />
          </div>
        </div>
        {/* "All dates" clears both ends, which is how past transfers are shown —
            there is no separate past/future toggle. */}
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          {([
            [t.today,    todayKey, todayKey],
            [t.next7,    todayKey, addDays(todayKey, 7)],
            [t.next30,   todayKey, addDays(todayKey, 30)],
            [t.upcoming, todayKey, ''],
            [t.allDates, '', ''],
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
        <div style={{textAlign:'center', padding:'60px', color:'rgba(255,255,255,0.3)'}}>{t.loading}</div>
      ) : days.length === 0 ? (
        <div style={{...card, textAlign:'center', padding:'48px', color:'rgba(255,255,255,0.35)'}}>
          <div style={{fontSize:'28px', marginBottom:'10px'}}>📅</div>
          <p style={{fontSize:'15px', margin:'0 0 4px', color:'rgba(255,255,255,0.5)'}}>{t.nothingScheduled}</p>
          <p style={{fontSize:'13px', margin:0, lineHeight:'1.6'}}>{t.nothingScheduledSub}</p>
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
                {byDay[key].length} {byDay[key].length === 1 ? t.transfer : t.transfers}
              </span>
            </div>

            {byDay[key].map((b: any) => {
              const dt = new Date(b.pickup_time)
              // direction 'outbound' = airport → resort (the traveller's arrival);
              // 'inbound' = resort → airport (their departure). Labelled in the
              // traveller's terms, since that is what the flight number refers to.
              const isArrival = b.direction === 'outbound'
              const isManual = b.source === 'manual'
              const custName = isManual ? (b.manual_customer_name || '—') : (b.customer?.full_name || '—')
              const custPhone = isManual
                ? (b.manual_customer_phone || b.customer_phone)
                : (b.customer_phone || b.customer?.phone)
              const wa = waDigits(custPhone)

              return (
                <div key={b.id} style={card}>
                  <div style={{display:'flex', gap:'12px', alignItems:'flex-start', flexWrap:'wrap'}}>
                    <div style={{minWidth:'56px', flexShrink:0}}>
                      <div style={{fontSize:'17px', fontWeight:'600', color:'#f4b942', lineHeight:'1.1'}}>
                        {dt.toLocaleTimeString('en-GB', {hour:'2-digit', minute:'2-digit', timeZone:'UTC'})}
                      </div>
                      <div style={{fontSize:'9px', letterSpacing:'0.08em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginTop:'2px'}}>
                        {isArrival ? `🛬 ${t.arrival}` : `🛫 ${t.departure}`}
                      </div>
                    </div>

                    <div style={{flex:1, minWidth:'190px'}}>
                      <div style={{fontSize:'14px', fontWeight:'500', color:'#ffffff', marginBottom:'3px'}}>
                        {b.pickup?.name} → {b.dropoff?.name}
                      </div>
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.45)'}}>
                        {custName} · {b.passengers} {t.pax}
                        {b.flight_number ? ` · ✈ ${b.flight_number}` : ''}
                        {b.group_id ? ` · ${t.partOfReturn}` : ''}
                      </div>
                      {custPhone && (
                        <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'5px', flexWrap:'wrap'}}>
                          <a href={`tel:${custPhone}`} style={{fontSize:'14px', fontWeight:'700', color:'#ff4d4d', textDecoration:'none'}}>
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

                    <div style={{minWidth:'130px', textAlign:'right', flexShrink:0}}>
                      <div style={{fontSize:'12px', color: b.driver ? 'rgba(255,255,255,0.7)' : '#f09595', fontWeight:'500'}}>
                        {b.driver ? b.driver.full_name : t.noDriverAssigned}
                      </div>
                      {b.vehicle && (
                        <div style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'2px'}}>
                          {b.vehicle.make} {b.vehicle.model}
                        </div>
                      )}
                      <div style={{fontSize:'13px', color:'#f4b942', fontWeight:'500', marginTop:'4px'}}>
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
