'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminCompetition() {
  const supabase = createClient() as any
  const [entries, setEntries] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10)
  })
  const [to, setTo] = useState(() => new Date().toISOString().slice(0,10))
  const [winner, setWinner] = useState<any>(null)
  const [drawing, setDrawing] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const fromTs = `${from}T00:00:00`
    const toTs = `${to}T23:59:59`
    const { data } = await supabase
      .from('competition_entries')
      .select(`*,
        customer:users!customer_id(full_name, email),
        request:quote_requests!quote_request_id(
          pickup:locations!pickup_location_id(name),
          dropoff:locations!dropoff_location_id(name),
          pickup_time, status, currency
        )`)
      .gte('created_at', fromTs)
      .lte('created_at', toTs)
      .order('created_at', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
    setWinner(null)
  }

  function drawWinner() {
    if (entries.length === 0) return
    setDrawing(true)
    setWinner(null)
    // Animated shuffle effect
    let count = 0
    const maxCount = 18
    const interval = setInterval(() => {
      const random = entries[Math.floor(Math.random() * entries.length)]
      setWinner(random)
      count++
      if (count >= maxCount) {
        clearInterval(interval)
        const finalWinner = entries[Math.floor(Math.random() * entries.length)]
        setWinner(finalWinner)
        setDrawing(false)
      }
    }, 80)
  }

  async function markWinner(entry: any) {
    if (!confirm(`Mark ${entry.customer?.full_name || entry.email} as the winner? This will be recorded.`)) return
    await supabase.from('competition_entries').update({ is_winner: true }).eq('id', entry.id)
    await load()
  }

  function exportCSV() {
    const rows = [['Entry ID','Name','Email','Route','Transfer date','Status','Answer','Entered','Winner']]
    entries.forEach(e => {
      rows.push([
        e.id,
        e.customer?.full_name ?? '',
        e.email ?? e.customer?.email ?? '',
        e.request ? `${e.request.pickup?.name ?? '?'} → ${e.request.dropoff?.name ?? '?'}` : '',
        e.request?.pickup_time ? new Date(e.request.pickup_time).toLocaleDateString('en-GB') : '',
        e.request?.status ?? '',
        e.preferences_answer ?? '',
        new Date(e.created_at).toLocaleDateString('en-GB'),
        e.is_winner ? 'YES' : '',
      ])
    })
    const csv = rows.map(r => r.map(String).map(v => `"${v.replace(/"/g,'""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'}))
    const a = document.createElement('a'); a.href=url; a.download=`competition-entries-${from}-to-${to}.csv`; a.click(); URL.revokeObjectURL(url)
  }

  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px' }
  const inp = { fontSize:'13px', padding:'8px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6', outline:'none', fontFamily:'inherit', colorScheme:'dark' as any }
  const answered = entries.filter(e => e.preferences_answer).length

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <div>
          <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'2px'}}>Prize draw</h1>
          <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>Competition entries · pick a winner · export</p>
        </div>
        <button onClick={exportCSV} style={{padding:'9px 16px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.7)', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>↓ Export CSV</button>
      </div>

      {/* Date filter */}
      <div style={{...card, marginBottom:'12px', display:'flex', gap:'12px', alignItems:'flex-end', flexWrap:'wrap'}}>
        <div>
          <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px'}}>From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px'}}>To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} style={inp} />
        </div>
        <button onClick={load} style={{padding:'9px 16px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit'}}>Apply</button>
      </div>

      {/* Stats */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'12px'}}>
        {[
          { label:'Total entries', value: entries.length },
          { label:'With answers', value: answered },
          { label:'Winners marked', value: entries.filter(e => e.is_winner).length },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{fontSize:'22px', fontWeight:'500', marginBottom:'4px', color:'#f4b942'}}>{s.value}</div>
            <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)'}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Winner picker */}
      <div style={{...card, marginBottom:'12px', textAlign:'center', background: winner && !drawing ? 'rgba(244,185,66,0.08)' : 'rgba(255,255,255,0.04)', border: winner && !drawing ? '1px solid rgba(244,185,66,0.3)' : '1px solid rgba(255,255,255,0.08)', transition:'all 0.2s'}}>
        {winner ? (
          <div style={{marginBottom:'14px'}}>
            <p style={{fontSize:'10px', letterSpacing:'0.15em', textTransform:'uppercase', color:'#f4b942', marginBottom:'8px'}}>{drawing ? 'Drawing...' : '🎉 Winner'}</p>
            <p style={{fontSize:'22px', fontWeight:'600', color:'#fff', marginBottom:'4px'}}>{winner.customer?.full_name || winner.email}</p>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)'}}>{winner.email}</p>
            {!drawing && winner.request && (
              <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'6px'}}>
                {winner.request.pickup?.name} → {winner.request.dropoff?.name}
              </p>
            )}
            {!drawing && winner.preferences_answer && (
              <p style={{fontSize:'13px', color:'rgba(255,255,255,0.6)', fontStyle:'italic', marginTop:'8px', maxWidth:'400px', margin:'8px auto 0'}}>"{winner.preferences_answer}"</p>
            )}
          </div>
        ) : (
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', marginBottom:'14px'}}>Draw a random winner from {entries.length} entr{entries.length===1?'y':'ies'} in this period</p>
        )}
        <div style={{display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap'}}>
          <button onClick={drawWinner} disabled={drawing || entries.length===0} style={{padding:'12px 28px', backgroundColor: entries.length===0 ? 'rgba(244,185,66,0.3)' : '#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'700', letterSpacing:'0.05em', textTransform:'uppercase', cursor: drawing||entries.length===0 ? 'not-allowed' : 'pointer', fontFamily:'inherit'}}>
            {drawing ? 'Drawing...' : winner ? '🔄 Draw again' : '🎲 Draw winner'}
          </button>
          {winner && !drawing && !winner.is_winner && (
            <button onClick={() => markWinner(winner)} style={{padding:'12px 20px', background:'none', border:'1px solid rgba(29,158,117,0.4)', borderRadius:'6px', color:'#1D9E75', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit'}}>
              ✓ Confirm as winner
            </button>
          )}
        </div>
      </div>

      {/* Entries list */}
      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : entries.length === 0 ? (
        <div style={{...card, textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>
          <div style={{fontSize:'32px', marginBottom:'12px'}}>🎟️</div>
          <p style={{fontSize:'14px'}}>No competition entries in this period</p>
        </div>
      ) : (
        <div style={card}>
          <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', marginBottom:'12px'}}>All entries</p>
          {entries.map((e:any) => (
            <div key={e.id} style={{padding:'12px 0', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'10px', flexWrap:'wrap'}}>
                <div style={{flex:1, minWidth:0}}>
                  <div style={{display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap'}}>
                    <span style={{fontSize:'14px', fontWeight:'500', color:'#fff'}}>{e.customer?.full_name || '—'}</span>
                    {e.is_winner && <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'8px', backgroundColor:'rgba(244,185,66,0.15)', color:'#f4b942', fontWeight:'600'}}>★ WINNER</span>}
                  </div>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginTop:'2px'}}>{e.email || e.customer?.email}</div>
                  {e.request && (
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)', marginTop:'2px'}}>
                      {e.request.pickup?.name} → {e.request.dropoff?.name}
                      {e.request.status && ` · ${e.request.status}`}
                    </div>
                  )}
                  {e.preferences_answer && (
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.55)', fontStyle:'italic', marginTop:'6px', padding:'8px 10px', backgroundColor:'rgba(255,255,255,0.03)', borderRadius:'5px'}}>"{e.preferences_answer}"</div>
                  )}
                </div>
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', flexShrink:0}}>
                  {new Date(e.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
