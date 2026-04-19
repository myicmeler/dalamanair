'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminDashboard() {
  const supabase = createClient() as any
  const [stats, setStats] = useState({
    totalBookings: 0, bookingsToday: 0, totalRevenue: 0, revenueToday: 0,
    providers: 0, pendingProviders: 0, drivers: 0, users: 0,
    pendingReviews: 0, avgRating: 0,
  })
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const today = new Date().toISOString().split('T')[0]

      const [
        { data: allBookings },
        { data: todayBookings },
        { data: providers },
        { data: drivers },
        { data: users },
        { data: reviews },
        { data: recentBookings },
      ] = await Promise.all([
        supabase.from('bookings').select('final_price, status'),
        supabase.from('bookings').select('final_price').gte('pickup_time', today + 'T00:00:00').lte('pickup_time', today + 'T23:59:59'),
        supabase.from('providers').select('is_approved, avg_rating'),
        supabase.from('drivers').select('id'),
        supabase.from('users').select('id'),
        supabase.from('reviews').select('rating, is_published'),
        supabase.from('bookings').select('*, customer:users(email, full_name), provider:providers(company_name), pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)').order('created_at', { ascending: false }).limit(10),
      ])

      const totalRevenue = (allBookings ?? []).reduce((s: number, b: any) => s + (b.final_price || 0), 0)
      const revenueToday = (todayBookings ?? []).reduce((s: number, b: any) => s + (b.final_price || 0), 0)
      const pendingProviders = (providers ?? []).filter((p: any) => !p.is_approved).length
      const approvedProviders = (providers ?? []).filter((p: any) => p.is_approved).length
      const pendingReviews = (reviews ?? []).filter((r: any) => !r.is_published).length
      const avgRating = reviews && reviews.length > 0
        ? reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length
        : 0

      setStats({
        totalBookings: allBookings?.length ?? 0,
        bookingsToday: todayBookings?.length ?? 0,
        totalRevenue, revenueToday,
        providers: approvedProviders,
        pendingProviders,
        drivers: drivers?.length ?? 0,
        users: users?.length ?? 0,
        pendingReviews,
        avgRating,
      })
      if (recentBookings) setRecent(recentBookings)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-1">Platform overview</h1>
      <p className="text-sm text-muted mb-8">
        {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>

      {loading ? (
        <div className="text-muted text-sm py-10 text-center">Loading stats...</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { num: stats.bookingsToday, label: 'Bookings today', sub: `${stats.totalBookings} all time` },
              { num: `€ ${stats.revenueToday.toFixed(0)}`, label: 'Revenue today', sub: `€ ${stats.totalRevenue.toFixed(0)} all time` },
              { num: stats.users, label: 'Total users', sub: 'Registered customers' },
              { num: stats.avgRating.toFixed(1) + '★', label: 'Platform rating', sub: 'Published reviews' },
            ].map(s => (
              <div key={s.label} className="bg-white/[0.03] border border-border rounded-lg p-4">
                <div className="text-2xl font-medium mb-1">{s.num}</div>
                <div className="text-xs tracking-widest text-muted uppercase">{s.label}</div>
                <div className="text-xs text-muted/50 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-3 mb-8">
            {[
              { num: stats.providers, label: 'Active providers', alert: false },
              { num: stats.pendingProviders, label: 'Pending approval', alert: stats.pendingProviders > 0 },
              { num: stats.drivers, label: 'Total drivers', alert: false },
              { num: stats.pendingReviews, label: 'Reviews to moderate', alert: stats.pendingReviews > 0 },
            ].map(s => (
              <div key={s.label} className={`border rounded-lg p-4 ${s.alert ? 'bg-amber/5 border-amber/30' : 'bg-white/[0.03] border-border'}`}>
                <div className="text-2xl font-medium mb-1">{s.num}</div>
                <div className="text-xs tracking-widest text-muted uppercase">{s.label}</div>
              </div>
            ))}
          </div>

          <h2 className="text-xs tracking-widest text-muted uppercase mb-4">Recent bookings</h2>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-white/[0.02]">
                  {['Created', 'Customer', 'Route', 'Provider', 'Price', 'Status'].map(h => (
                    <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recent.length === 0 ? (
                  <tr><td colSpan={6} className="text-center text-muted text-sm py-10">No bookings yet</td></tr>
                ) : recent.map((b: any) => (
                  <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                    <td className="px-4 py-3 text-xs text-muted">
                      {new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {b.customer?.full_name ?? b.customer?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted">{b.pickup?.name} → {b.dropoff?.name}</td>
                    <td className="px-4 py-3 text-sm text-muted">{b.provider?.company_name ?? '—'}</td>
                    <td className="px-4 py-3 text-sm">€ {b.final_price?.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded bg-white/10 text-muted capitalize">
                        {b.status?.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
