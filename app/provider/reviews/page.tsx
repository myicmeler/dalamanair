'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderReviews() {
  const supabase = createClient() as any
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id, avg_rating').eq('user_id', user.id).single()
      if (!provider) return
      setAvgRating(provider.avg_rating || 0)
      const { data: rv } = await supabase
        .from('reviews')
        .select('*, customer:users(full_name), booking:bookings(pickup_time, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name))')
        .eq('provider_id', provider.id).order('created_at', {ascending:false})
      if (rv) setReviews(rv)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', alignItems:'baseline', gap:'12px', marginBottom:'20px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Reviews</h1>
        <span style={{fontSize:'24px', fontWeight:'300', color:'rgba(255,255,255,0.2)'}}>{avgRating.toFixed(1)}★</span>
        <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{reviews.length} reviews</span>
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : reviews.length===0 ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)', fontSize:'14px'}}>No reviews yet</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {reviews.map((r:any) => (
            <div key={r.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px'}}>
                <div>
                  <div style={{display:'flex', gap:'2px', marginBottom:'4px'}}>
                    {[1,2,3,4,5].map(i => (
                      <div key={i} style={{width:'12px', height:'12px', backgroundColor:i<=r.rating?'#f4b942':'rgba(255,255,255,0.15)',
                        clipPath:'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'}} />
                    ))}
                  </div>
                  <p style={{fontSize:'13px', fontWeight:'500'}}>{r.customer?.full_name??'Anonymous'}</p>
                  {r.booking && (
                    <p style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', marginTop:'2px'}}>
                      {r.booking.pickup?.name} → {r.booking.dropoff?.name}
                    </p>
                  )}
                </div>
                <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px',
                  backgroundColor:r.is_published?'rgba(29,158,117,0.15)':'rgba(239,159,39,0.15)',
                  color:r.is_published?'#1D9E75':'#EF9F27'}}>
                  {r.is_published?'Published':'Pending'}
                </span>
              </div>
              {r.aspects?.length>0 && (
                <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginBottom:'8px'}}>
                  {r.aspects.map((a:string) => (
                    <span key={a} style={{fontSize:'10px', padding:'3px 8px', backgroundColor:'rgba(255,255,255,0.06)', borderRadius:'10px', textTransform:'capitalize', color:'rgba(255,255,255,0.5)'}}>{a.replace('_',' ')}</span>
                  ))}
                </div>
              )}
              {r.comment && <p style={{fontSize:'13px', color:'rgba(255,255,255,0.6)', fontStyle:'italic'}}>"{r.comment}"</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
