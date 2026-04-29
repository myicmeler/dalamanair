'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const UTM_CAMPAIGNS = [
  { source:'facebook', medium:'organic', campaign:'myicmeler', label:'myicmeler.net Facebook' },
  { source:'facebook', medium:'paid', campaign:'launch', label:'Facebook Ads' },
  { source:'tiktok', medium:'organic', campaign:'reels', label:'TikTok / Reels' },
  { source:'whatsapp', medium:'outreach', campaign:'providers', label:'WhatsApp Provider' },
  { source:'email', medium:'outreach', campaign:'providers', label:'Email Provider' },
  { source:'qr', medium:'print', campaign:'flyer', label:'QR Code — Flyer' },
  { source:'qr', medium:'print', campaign:'hotel', label:'QR Code — Hotel' },
]

export default function OutreachDashboard() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d'|'30d'|'all'>('30d')

  useEffect(() => { load() }, [period])

  async function load() {
    setLoading(true)
    let query = supabase.from('bookings').select('id, created_at, final_price, status, utm_source, utm_medium, utm_campaign')
    
    if (period !== 'all') {
      const days = period === '7d' ? 7 : 30
      const from = new Date()
      from.setDate(from.getDate() - days)
      query = query.gte('created_at', from.toISOString())
    }

    const { data } = await query.order('created_at', { ascending: false })
    if (data) setBookings(data)
    setLoading(false)
  }

  function getStats(source?: string, medium?: string, campaign?: string) {
    const filtered = bookings.filter(b => {
      if (source && b.utm_source !== source) return false
      if (medium && b.utm_medium !== medium) return false
      if (campaign && b.utm_campaign !== campaign) return false
      return true
    })
    const confirmed = filtered.filter(b => b.status === 'confirmed' || b.status === 'completed' || b.status === 'driver_assigned')
    const revenue = confirmed.reduce((s: number, b: any) => s + (b.final_price || 0), 0)
    return { total: filtered.length, confirmed: confirmed.length, revenue }
  }

  const totalStats = getStats()
  const noUtm = bookings.filter(b => !b.utm_source).length

  const cardStyle = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', flexWrap:'wrap', gap:'10px'}}>
        <div>
          <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'4px'}}>Outreach dashboard</h1>
          <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)'}}>Track which channels are driving bookings</p>
        </div>
        <div style={{display:'flex', gap:'6px'}}>
          {(['7d','30d','all'] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding:'7px 14px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', background:'none',
              borderColor:period===p?'#f4b942':'rgba(255,255,255,0.15)',
              color:period===p?'#f4b942':'rgba(255,255,255,0.4)',
            }}>{p === 'all' ? 'All time' : `Last ${p}`}</button>
          ))}
        </div>
      </div>

      {/* Overall stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px'}}>
        {[
          { num: totalStats.total, label: 'Total bookings' },
          { num: totalStats.confirmed, label: 'Confirmed' },
          { num: `€${totalStats.revenue.toFixed(0)}`, label: 'Revenue' },
        ].map(s => (
          <div key={s.label} style={cardStyle}>
            <div style={{fontSize:'24px', fontWeight:'500', marginBottom:'4px'}}>{s.num}</div>
            <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* By channel */}
      <h2 style={{fontSize:'12px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'12px'}}>Bookings by channel</h2>
      <div style={{display:'flex', flexDirection:'column', gap:'8px', marginBottom:'20px'}}>
        {UTM_CAMPAIGNS.map(utm => {
          const stats = getStats(utm.source, utm.medium, utm.campaign)
          const pct = totalStats.total > 0 ? Math.round((stats.total / totalStats.total) * 100) : 0
          return (
            <div key={utm.campaign} style={cardStyle}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
                <div style={{fontSize:'13px', fontWeight:'500'}}>{utm.label}</div>
                <div style={{display:'flex', gap:'16px', fontSize:'12px'}}>
                  <span style={{color:'rgba(255,255,255,0.5)'}}>{stats.total} bookings</span>
                  <span style={{color:'#1D9E75'}}>€{stats.revenue.toFixed(0)}</span>
                </div>
              </div>
              <div style={{backgroundColor:'rgba(255,255,255,0.06)', borderRadius:'4px', height:'6px', overflow:'hidden'}}>
                <div style={{width:`${pct}%`, height:'100%', backgroundColor:'#f4b942', borderRadius:'4px', transition:'width 0.5s'}} />
              </div>
              <div style={{fontSize:'10px', color:'rgba(255,255,255,0.3)', marginTop:'4px'}}>{pct}% of total</div>
            </div>
          )
        })}

        {noUtm > 0 && (
          <div style={cardStyle}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px'}}>
              <div style={{fontSize:'13px', fontWeight:'500', color:'rgba(255,255,255,0.5)'}}>Direct / Unknown</div>
              <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{noUtm} bookings</span>
            </div>
            <div style={{backgroundColor:'rgba(255,255,255,0.06)', borderRadius:'4px', height:'6px', overflow:'hidden'}}>
              <div style={{width:`${Math.round((noUtm/totalStats.total)*100)}%`, height:'100%', backgroundColor:'rgba(255,255,255,0.2)', borderRadius:'4px'}} />
            </div>
          </div>
        )}
      </div>

      {/* UTM Links */}
      <h2 style={{fontSize:'12px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'12px'}}>UTM tracking links</h2>
      <div style={{display:'flex', flexDirection:'column', gap:'6px'}}>
        {UTM_CAMPAIGNS.map(utm => {
          const url = `https://dalaman.me${utm.medium==='outreach'?'/provider':''}/?utm_source=${utm.source}&utm_medium=${utm.medium}&utm_campaign=${utm.campaign}`
          return (
            <div key={utm.campaign} style={{...cardStyle, padding:'12px 16px'}}>
              <div style={{fontSize:'12px', fontWeight:'500', marginBottom:'4px'}}>{utm.label}</div>
              <div style={{display:'flex', alignItems:'center', gap:'8px'}}>
                <div style={{fontSize:'11px', fontFamily:'monospace', color:'rgba(255,255,255,0.5)', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{url}</div>
                <button onClick={() => navigator.clipboard.writeText(url)} style={{padding:'4px 10px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', fontSize:'11px', cursor:'pointer', flexShrink:0}}>
                  Copy
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
