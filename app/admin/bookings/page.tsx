'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminBookings() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'pending'|'confirmed'|'completed'|'cancelled'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('bookings')
        .select('*, customer:users(email, full_name), provider:providers(company_name), driver:drivers(full_name), vehicle:vehicles(make, model), pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
        .order('created_at', { ascending: false })
      if (data) setBookings(data)
      setLoading(false)
    }
    load()
  }, [])

  const filtered = bookings.filter((b: any) => {
    if (filter !== 'all') {
      if (filter === 'confirmed' && !(b.status === 'confirmed' || b.status === 'driver_assigned')) return false
      if (filter !== 'confirmed' && b.status !== filter) return false
    }
    if (search) {
      const s = search.toLowerCase()
      const cust = (b.customer?.email || '') + ' ' + (b.customer?.full_name || '')
      if (!cust.toLowerCase().includes(s) && !b.id.toLowerCase().includes(s)) return false
    }
    return true
  })

  const statusBadge: Record<string, string> = {
    pending: 'bg-amber/15 text-amber',
    confirmed: 'bg-teal/15 text-teal',
    driver_assigned: 'bg-blue/15 text-blue',
    completed: 'bg-white/10 text-muted',
    cancelled: 'bg-red-900/20 text-red-400',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-6">All bookings</h1>

      <div className="flex gap-3 mb-6 items-center">
        <div className="flex gap-2">
          {(['all','pending','confirmed','completed','cancelled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded border capitalize transition-all ${
                filter === f ? 'border-paper/35 text-paper' : 'border-border text-muted hover:text-paper'
              }`}>{f}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search email or booking ID..."
          className="px-3 py-1.5 text-xs rounded flex-1 max-w-sm" />
        <span className="text-xs text-muted">{filtered.length} bookings</span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {['Date & time', 'Customer', 'Route', 'Provider', 'Driver', 'Price', 'Status'].map(h => (
                <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-muted text-sm py-10">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted text-sm py-10">No bookings found</td></tr>
            ) : filtered.map((b: any) => (
              <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                <td className="px-4 py-3">
                  <div className="text-sm">{new Date(b.pickup_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</div>
                  <div className="text-xs text-muted">{new Date(b.pickup_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">{b.customer?.full_name ?? '—'}</div>
                  <div className="text-xs text-muted">{b.customer?.email ?? '—'}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">{b.pickup?.name} → {b.dropoff?.name}</div>
                  <div className="text-xs text-muted">{b.direction === 'outbound' ? 'Outbound' : 'Inbound'} · {b.passengers} pax</div>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{b.provider?.company_name ?? '—'}</td>
                <td className="px-4 py-3 text-sm text-muted">{b.driver?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-sm">€ {b.final_price?.toFixed(2)}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge[b.status] ?? 'bg-white/10 text-muted'}`}>
                    {b.status?.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
