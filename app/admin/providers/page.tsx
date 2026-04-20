'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminProviders() {
  const supabase = createClient() as any
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'pending'|'approved'>('all')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('providers').select('*, user:users(email, full_name)').order('created_at', {ascending:false})
      if (data) setProviders(data)
      setLoading(false)
    }
    load()
  }, [])

  async function approve(id: string) {
    await supabase.from('providers').update({ is_approved:true }).eq('id', id)
    setProviders(prev => prev.map(p => p.id===id ? {...p, is_approved:true} : p))
  }

  async function unapprove(id: string) {
    await supabase.from('providers').update({ is_approved:false }).eq('id', id)
    setProviders(prev => prev.map(p => p.id===id ? {...p, is_approved:false} : p))
  }

  const filtered = providers.filter(p => {
    if (filter==='pending') return !p.is_approved
    if (filter==='approved') return p.is_approved
    return true
  })

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Providers</h1>
        <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{filtered.length}</span>
      </div>

      <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
        {(['all','pending','approved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 14px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', textTransform:'capitalize', background:'none',
            borderColor:filter===f?'#f4b942':'rgba(255,255,255,0.15)',
            color:filter===f?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {filtered.map((p:any) => (
            <div key={p.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                <div>
                  <div style={{fontSize:'15px', fontWeight:'500', marginBottom:'2px'}}>{p.company_name}</div>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{p.user?.email||'—'}</div>
                </div>
                <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', flexShrink:0, marginLeft:'8px',
                  backgroundColor:p.is_approved?'rgba(29,158,117,0.15)':'rgba(239,159,39,0.15)',
                  color:p.is_approved?'#1D9E75':'#EF9F27'}}>
                  {p.is_approved?'Approved':'Pending'}
                </span>
              </div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'12px'}}>
                {p.avg_rating?.toFixed(1)||'0.0'}★ · {p.commission_pct||0}% commission
              </div>
              <button onClick={() => p.is_approved ? unapprove(p.id) : approve(p.id)} style={{
                width:'100%', padding:'10px', border:'1px solid', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', background:'none',
                borderColor:p.is_approved?'rgba(162,45,45,0.4)':'rgba(29,158,117,0.4)',
                color:p.is_approved?'#f09595':'#1D9E75',
              }}>{p.is_approved?'Unapprove':'Approve'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
