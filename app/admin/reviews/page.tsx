'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminReviews() {
  const supabase = createClient() as any
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending'|'published'|'all'>('pending')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('reviews')
        .select('*, customer:users(email, full_name), provider:providers(company_name), booking:bookings(pickup_time, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name))')
        .order('created_at', {ascending:false})
      if (data) setReviews(data)
      setLoading(false)
    }
    load()
  }, [])

  async function publish(id: string) {
    await supabase.from('reviews').update({ is_published:true }).eq('id', id)
    setReviews(prev => prev.map(r => r.id===id ? {...r, is_published:true} : r))
  }

  async function unpublish(id: string) {
    await supabase.from('reviews').update({ is_published:false }).eq('id', id)
    setReviews(prev => prev.map(r => r.id===id ? {...r, is_published:false} : r))
  }

  async function deleteReview(id: string) {
    if (!confirm('Delete this review?')) return
    await supabase.from('reviews').delete().eq('id', id)
    setReviews(prev => prev.filter(r => r.id!==id))
  }

  const filtered = reviews.filter(r => {
    if (filter==='pending') return !r.is_published
    if (filter==='published') return r.is_published
    return true
  })

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Reviews</h1>
        <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{filtered.length}</span>
      </div>

      <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
        {(['pending','published','all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 14px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', textTransform:'capitalize', background:'none',
            borderColor:filter===f?'#f4b942':'rgba(255,255,255,0.15)',
            color:filter===f?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{f}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : filtered.length===0 ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)', fontSize:'14px'}}>No reviews found</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {filtered.map((r:any) => (
            <div key={r.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                <div>
                  <div style={{display:'flex', gap:'2px', marginBottom:'4px'}}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{width:'11px', height:'11px', backgroundColor:i<=r.rating?'#f4b942':'rgba(255,255,255,0.15)',
                        clipPath:'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'}} />
                    ))}
                  </div>
                  <div style={{fontSize:'13px', fontWeight:'500'}}>{r.customer?.full_name||r.customer?.email||'Anonymous'}</div>
                  <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'1px'}}>{r.provider?.company_name||'—'}</div>
                </div>
                <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', flexShrink:0, marginLeft:'8px',
                  backgroundColor:r.is_published?'rgba(29,158,117,0.15)':'rgba(239,159,39,0.15)',
                  color:r.is_published?'#1D9E75':'#EF9F27'}}>
                  {r.is_published?'Published':'Pending'}
                </span>
              </div>
              {r.comment && <p style={{fontSize:'13px', color:'rgba(255,255,255,0.6)', fontStyle:'italic', marginBottom:'10px'}}>"{r.comment}"</p>}
              <div style={{display:'flex', gap:'8px'}}>
                {r.is_published ? (
                  <button onClick={() => unpublish(r.id)} style={{flex:1, padding:'9px', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer', background:'none'}}>Unpublish</button>
                ) : (
                  <button onClick={() => publish(r.id)} style={{flex:1, padding:'9px', border:'1px solid rgba(29,158,117,0.4)', borderRadius:'6px', color:'#1D9E75', fontSize:'12px', fontWeight:'500', cursor:'pointer', background:'none'}}>Approve & publish</button>
                )}
                <button onClick={() => deleteReview(r.id)} style={{padding:'9px 14px', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'6px', color:'#f09595', fontSize:'12px', cursor:'pointer', background:'none'}}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
