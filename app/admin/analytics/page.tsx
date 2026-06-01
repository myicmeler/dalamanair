'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminAnalytics() {
  const supabase = createClient() as any
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<any>({})

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const now = new Date()
    const day7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const day30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: allRequests },
      { data: allOffers },
      { data: allBookings },
      { data: allProviders },
    ] = await Promise.all([
      supabase.from('quote_requests').select('id, status, created_at, currency, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), trip_type'),
      supabase.from('quote_offers').select('id, status, created_at, price, provider_id, request_id'),
      supabase.from('bookings').select('id, status, created_at, pickup_time, final_price'),
      supabase.from('providers').select('id, company_name, is_approved'),
    ])

    const requests = allRequests ?? []
    const offers = allOffers ?? []
    const bookings = allBookings ?? []
    const providers = allProviders ?? []

    // Basic counts
    const totalRequests = requests.length
    const openRequests = requests.filter((r: any) => r.status === 'open').length
    const acceptedRequests = requests.filter((r: any) => r.status === 'accepted').length
    const expiredRequests = requests.filter((r: any) => r.status === 'expired').length
    const cancelledRequests = requests.filter((r: any) => r.status === 'cancelled').length
    const conversionRate = totalRequests > 0 ? ((acceptedRequests / totalRequests) * 100).toFixed(1) : '0'

    // Last 7 and 30 days
    const requests7 = requests.filter((r: any) => r.created_at > day7).length
    const requests30 = requests.filter((r: any) => r.created_at > day30).length
    const offers7 = offers.filter((o: any) => o.created_at > day7).length

    // Currency split
    const gbpRequests = requests.filter((r: any) => r.currency === 'GBP').length
    const eurRequests = requests.filter((r: any) => r.currency !== 'GBP').length

    // Trip type split
    const returnTrips = requests.filter((r: any) => r.trip_type === 'return').length
    const onewayTrips = requests.filter((r: any) => r.trip_type !== 'return').length

    // Top routes
    const routeCounts: Record<string, number> = {}
    requests.forEach((r: any) => {
      const route = `${r.pickup?.name ?? '?'} → ${r.dropoff?.name ?? '?'}`
      routeCounts[route] = (routeCounts[route] ?? 0) + 1
    })
    const topRoutes = Object.entries(routeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    // Provider activity
    const providerOfferCounts: Record<string, number> = {}
    offers.forEach((o: any) => {
      providerOfferCounts[o.provider_id] = (providerOfferCounts[o.provider_id] ?? 0) + 1
    })
    const topProviders = Object.entries(providerOfferCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        name: providers.find((p: any) => p.id === id)?.company_name ?? id,
        count
      }))

    // Requests per day (last 14 days)
    const dayLabels: string[] = []
    const dayCounts: number[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      const count = requests.filter((r: any) => {
        const rd = new Date(r.created_at)
        return rd.toDateString() === d.toDateString()
      }).length
      dayLabels.push(label)
      dayCounts.push(count)
    }

    // Average offers per request
    const requestsWithOffers = requests.filter((r: any) =>
      offers.some((o: any) => o.request_id === r.id)
    ).length
    const avgOffers = requestsWithOffers > 0
      ? (offers.length / requestsWithOffers).toFixed(1)
      : '0'

    // Approved vs pending providers
    const approvedProviders = providers.filter((p: any) => p.is_approved).length
    const pendingProviders = providers.filter((p: any) => !p.is_approved).length

    setStats({
      totalRequests, openRequests, acceptedRequests, expiredRequests, cancelledRequests,
      conversionRate, requests7, requests30, offers7,
      gbpRequests, eurRequests, returnTrips, onewayTrips,
      topRoutes, topProviders, dayLabels, dayCounts, avgOffers,
      approvedProviders, pendingProviders,
      totalOffers: offers.length, totalBookings: bookings.length,
    })
    setLoading(false)
  }

  const card: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }
  const maxDay = Math.max(...(stats.dayCounts ?? [1]))

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '500', marginBottom: '2px' }}>Analytics</h1>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Platform overview — all time unless noted</p>
        </div>
        <button onClick={load} style={{ padding: '8px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'rgba(255,255,255,0.6)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>↻ Refresh</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
      ) : (
        <>
          {/* Top stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '20px' }}>
            {[
              { label: 'Total requests', value: stats.totalRequests, color: '#f4b942' },
              { label: 'Open', value: stats.openRequests, color: '#f4b942' },
              { label: 'Accepted', value: stats.acceptedRequests, color: '#1D9E75' },
              { label: 'Expired', value: stats.expiredRequests, color: 'rgba(255,255,255,0.4)' },
              { label: 'Cancelled', value: stats.cancelledRequests, color: '#f09595' },
              { label: 'Conversion', value: `${stats.conversionRate}%`, color: '#1D9E75' },
              { label: 'Total offers', value: stats.totalOffers, color: '#f4b942' },
              { label: 'Avg offers/req', value: stats.avgOffers, color: '#f4b942' },
              { label: 'Bookings', value: stats.totalBookings, color: '#1D9E75' },
            ].map(s => (
              <div key={s.label} style={card}>
                <div style={{ fontSize: '24px', fontWeight: '500', color: s.color, marginBottom: '4px' }}>{s.value}</div>
                <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent activity */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={card}>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Recent activity</p>
              {[
                { label: 'Requests last 7 days', value: stats.requests7 },
                { label: 'Requests last 30 days', value: stats.requests30 },
                { label: 'Offers last 7 days', value: stats.offers7 },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                  <span style={{ color: '#f4b942', fontWeight: '500' }}>{s.value}</span>
                </div>
              ))}
            </div>

            <div style={card}>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Providers</p>
              {[
                { label: 'Approved', value: stats.approvedProviders },
                { label: 'Pending', value: stats.pendingProviders },
                { label: 'Total', value: stats.approvedProviders + stats.pendingProviders },
              ].map(s => (
                <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '13px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>{s.label}</span>
                  <span style={{ color: '#f4b942', fontWeight: '500' }}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Currency + trip type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
            <div style={card}>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Currency split</p>
              {[
                { label: '€ EUR', value: stats.eurRequests },
                { label: '£ GBP', value: stats.gbpRequests },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
                    <span style={{ color: '#f4b942' }}>{s.value}</span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                    <div style={{ height: '4px', backgroundColor: '#f4b942', borderRadius: '2px', width: `${stats.totalRequests > 0 ? (s.value / stats.totalRequests * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>

            <div style={card}>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Trip type</p>
              {[
                { label: 'One way', value: stats.onewayTrips },
                { label: 'Return', value: stats.returnTrips },
              ].map(s => (
                <div key={s.label} style={{ marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px' }}>
                    <span style={{ color: 'rgba(255,255,255,0.6)' }}>{s.label}</span>
                    <span style={{ color: '#f4b942' }}>{s.value}</span>
                  </div>
                  <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px' }}>
                    <div style={{ height: '4px', backgroundColor: '#f4b942', borderRadius: '2px', width: `${stats.totalRequests > 0 ? (s.value / stats.totalRequests * 100) : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Requests per day chart */}
          <div style={{ ...card, marginBottom: '20px' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '16px' }}>Requests — last 14 days</p>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '80px' }}>
              {(stats.dayCounts ?? []).map((count: number, i: number) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>{count > 0 ? count : ''}</div>
                  <div style={{
                    width: '100%', backgroundColor: count > 0 ? '#f4b942' : 'rgba(255,255,255,0.06)',
                    borderRadius: '2px 2px 0 0',
                    height: `${maxDay > 0 ? Math.max((count / maxDay) * 60, count > 0 ? 4 : 0) : 0}px`,
                    minHeight: count > 0 ? '4px' : '0'
                  }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '4px', marginTop: '6px' }}>
              {(stats.dayLabels ?? []).map((label: string, i: number) => (
                <div key={i} style={{ flex: 1, fontSize: '9px', color: 'rgba(255,255,255,0.25)', textAlign: 'center', overflow: 'hidden' }}>
                  {i % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>
          </div>

          {/* Top routes + providers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={card}>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Top routes</p>
              {(stats.topRoutes ?? []).map(([route, count]: [string, number], i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{route}</span>
                  <span style={{ color: '#f4b942', fontWeight: '500', flexShrink: 0 }}>{count}</span>
                </div>
              ))}
              {(stats.topRoutes ?? []).length === 0 && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No data yet</p>}
            </div>

            <div style={card}>
              <p style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '12px' }}>Most active providers</p>
              {(stats.topProviders ?? []).map((p: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: '12px' }}>
                  <span style={{ color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{p.name}</span>
                  <span style={{ color: '#f4b942', fontWeight: '500', flexShrink: 0 }}>{p.count} offers</span>
                </div>
              ))}
              {(stats.topProviders ?? []).length === 0 && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>No data yet</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
