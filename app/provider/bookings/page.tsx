
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ProviderLayout from '../layout'

export default function ProviderBookings() {
  const supabase = createClient() as any
  const [bookings, setBookings] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'unassigned'|'confirmed'|'completed'>('all')
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
      if (!provider) return

      const { data: bk } = await supabase
        .from('bookings')
        .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), driver:drivers(full_name, status), vehicle:vehicles(make, model)')
        .eq('provider_id', provider.id)
        .order('pickup_time', { ascending: true })

      if (bk) setBookings(bk)

      const { data: dr } = await supabase.from('drivers').select('*').eq('provider_id', provider.id).eq('is_active', true)
      if (dr) setDrivers(dr)
      setLoading(false)
    }
    load()
  }, [])

  async function assignDriver(bookingId: string, driverId: string) {
    await supabase.from('bookings').update({ driver_id: driverId, status: 'driver_assigned' }).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId
      ? { ...b, driver_id: driverId, status: 'driver_assigned', driver: drivers.find(d => d.id === driverId) }
      : b
    ))
    setAssigning(null)
  }

  const filtered = bookings.filter(b => {
    if (filter === 'unassigned') return !b.driver_id
    if (filter === 'confirmed') return b.status === 'confirmed' || b.status === 'driver_assigned'
    if (filter === 'completed') return b.status === 'completed'
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
    <ProviderLayout>
      <div className="p-8">
        <h1 className="text-2xl font-medium mb-6">All bookings</h1>

        <div className="flex gap-2 mb-6">
          {(['all','unassigned','confirmed','completed'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded border capitalize transition-all ${
                filter === f ? 'border-paper/35 text-paper' : 'border-border text-muted hover:text-paper'
              }`}>{f}</button>
          ))}
          <span className="text-xs text-muted self-center ml-2">{filtered.length} bookings</span>
        </div>

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                {['Date & time', 'Route', 'Pax', 'Vehicle', 'Driver', 'Price', 'Status', ''].map(h => (
                  <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center text-muted text-sm py-10">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center text-muted text-sm py-10">No bookings found</td></tr>
              ) : filtered.map((b: any) => (
                <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                  <td className="px-4 py-3">
                    <div className="text-sm">{new Date(b.pickup_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</div>
                    <div className="text-xs text-muted">{new Date(b.pickup_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">{b.pickup?.name} → {b.dropoff?.name}</div>
                    <div className="text-xs text-muted">{b.direction === 'outbound' ? '→ Outbound' : '← Inbound'}</div>
                  </td>
                  <td className="px-4 py-3 text-sm">{b.passengers}</td>
                  <td className="px-4 py-3 text-sm text-muted">{b.vehicle ? `${b.vehicle.make} ${b.vehicle.model}` : '—'}</td>
                  <td className="px-4 py-3">
                    {b.driver ? (
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${b.driver.status === 'available' ? 'bg-teal' : 'bg-amber'}`} />
                        <span className="text-sm">{b.driver.full_name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">€ {b.final_price?.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge[b.status] ?? 'bg-white/10 text-muted'}`}>
                      {b.status?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {!b.driver_id && assigning === b.id ? (
                      <div className="flex items-center gap-1">
                        <select className="text-xs px-2 py-1 rounded"
                          value={selectedDriver[b.id] ?? ''}
                          onChange={e => setSelectedDriver(prev => ({ ...prev, [b.id]: e.target.value }))}>
                          <option value="">Driver</option>
                          {drivers.map((d: any) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                        </select>
                        <button onClick={() => selectedDriver[b.id] && assignDriver(b.id, selectedDriver[b.id])}
                          className="text-xs bg-paper text-ink px-2 py-1 rounded">OK</button>
                        <button onClick={() => setAssigning(null)} className="text-xs text-muted">✕</button>
                      </div>
                    ) : !b.driver_id ? (
                      <button onClick={() => setAssigning(b.id)}
                        className="text-xs bg-paper text-ink px-3 py-1.5 rounded hover:bg-paper/90 transition-colors">
                        Assign
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProviderLayout>
  )
}
