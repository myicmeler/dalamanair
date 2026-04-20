'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminDashboard() {
  const supabase = createClient() as any
  const [stats, setStats] = useState({ totalBookings:0, bookingsToday:0, totalRevenue:0, revenueToday:0, providers:0, pendingProviders:0, pendingReviews:0, users:0, avgRating:0 })
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]
      const [{ data: allBk }, { data: todayBk }, { data: providers }, { data: users }, { data: reviews }, { data: recentBk }] = await Promise.all([
        supabase.from('bookings').select('final_price, status'),
        supabase.from('bookings').select('final_price').gte('pickup_time', today+'T00:00:00').lte('pickup_time', today+'T23:59:59'),
        supabase.from('providers').select('is_approved, avg_rating'),
        supabase.from('users').select('id'),
        supabase.from('reviews').select('rating, is_published'),
        supabase.from('bookings').select('*, customer:users(email), pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)').order('created_at', {ascending:false}).limit(5),
      ])
      const totalRevenue = (allBk??[]).reduce((s:number,b:any)=>s+(b.final_price||0),0)
      const revenueToday = (todayBk??[]).reduce((s:number,b:any)=>s+(b.final_price||0),0)
      const avgRating = reviews&&reviews.length>0 ? reviews.reduce((s:number,r:any)=>s+(r.rating||0),0)/reviews.length : 0
      setStats({
        totalBookings:allBk?.length??0, bookingsToday:todayBk?.length??0,
        totalRevenue, revenueToday,
        providers:(providers??[]).filter((p:any)=>p.is_approved).length,
        pendingProviders:(providers??[]).filter((p:any)=>!p.is_approved).length,
        pendingReviews:(reviews??[]).filter((r:any)=>!r.is_published).length,
        users:users?.length??0, avgRating,
      })
      if (recentBk) setRecent(recentBk)
      setLoading(false)
    }
    load()
  }, [])

  const statusColor: Record<string,string> = {
    pending:'#EF9F27', confirmed:'#1D9E75', driver_assigned:'#378ADD', completed:'#8a8680', cancelled:'#E24B4A'
  }

  return (
    <div style={{padding:'16px'}}>
      <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'rgba(255,255,255,0.3)', textTransform:'uppercase', marginBottom:'4px'}}>
        {new Date().toLocaleDateString('en-GB', {weekday:'long', day:'numeric', month:'long'})}
      </p>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'16px'}}>Platform overview</h1>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'20px'}}>
            {[
              {num:stats.bookingsToday, label:'Today', sub:`${stats.totalBookings} total`},
              {num:`€${stats.revenueToday.toFixed(0)}`, label:'Revenue today', sub:`€${stats.totalRevenue.toFixed(0)} total`},
              {num:stats.users, label:'Users', sub:'Registered'},
              {num:stats.avgRating.toFixed(1)+'★', label:'Platform rating', sub:'Reviews'},
            ].map(s => (
              <div key={s.label} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
                <div style={{fontSize:'22px', fontWeight:'500', marginBottom:'2px'}}>{s.num}</div>
                <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>{s.label}</div>
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'2px'}}>{s.sub}</div>
              </div>
            ))}
          </div>

          {(stats.pendingProviders > 0 || stats.pendingReviews > 0) && (
            <div style={{marginBottom:'20px'}}>
              <h2 style={{fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'10px'}}>Needs attention</h2>
              <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
                {stats.pendingProviders > 0 && (
                  <a href="/admin/providers" style={{display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(239,159,39,0.1)', border:'1px solid rgba(239,159,39,0.3)', borderRadius:'8px', padding:'14px', textDecoration:'none'}}>
                    <span style={{fontSize:'13px', color:'#EF9F27'}}>Providers awaiting approval</span>
                    <span style={{fontSize:'18px', fontWeight:'500', color:'#EF9F27'}}>{stats.pendingProviders}</span>
                  </a>
                )}
                {stats.pendingReviews > 0 && (
                  <a href="/admin/reviews" style={{display:'flex', justifyContent:'space-between', alignItems:'center', backgroundColor:'rgba(239,159,39,0.1)', border:'1px solid rgba(239,159,39,0.3)', borderRadius:'8px', padding:'14px', textDecoration:'none'}}>
                    <span style={{fontSize:'13px', color:'#EF9F27'}}>Reviews to moderate</span>
                    <span style={{fontSize:'18px', fontWeight:'500', color:'#EF9F27'}}>{stats.pendingReviews}</span>
                  </a>
                )}
              </div>
            </div>
          )}

          <h2 style={{fontSize:'11px', letterSpacing:'0.15em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'10px'}}>Recent bookings</h2>
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {recent.map((b:any) => (
              <div key={b.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'12px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <div>
                  <div style={{fontSize:'13px', fontWeight:'500', marginBottom:'2px'}}>{b.pickup?.name} → {b.dropoff?.name}</div>
                  <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>{b.customer?.email} · {new Date(b.created_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short'})}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'13px', fontWeight:'500', marginBottom:'4px'}}>€{b.final_price?.toFixed(0)}</div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:`${statusColor[b.status]}20`, color:statusColor[b.status]}}>
                    {b.status?.replace('_',' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
