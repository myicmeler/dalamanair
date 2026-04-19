'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ProviderLayout from './layout'

export default function ProviderDashboard() {
  const supabase = createClient() as any
  const [stats, setStats] = useState({ today: 0, unassigned: 0, rating: 0, revenue: 0, paid: 0, total: 0 })
  const [bookings, setBookings] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [vehicles, setVehicles] = useState<any[]>([])
  const [providerId, setProviderId] = useState<string | null>(null)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({})

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase
        .from('providers')
        .select('id, avg_rating, total_reviews')
        .eq('user_id', user.id)
        .single()
      if (!provider) return
      setProviderId(provider.id)

      const today = new Date().toISOString().split('T')[0]
      const { data: bk } = await supabase
        .from('bookings')
        .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), driver:drivers(full_name, status), vehicle:vehicles(make, model)')
        .eq('provider_id', provider.id)
        .gte('pickup_time', today + 'T00:00:00')
        .lte('pickup_time', today + 'T23:59:59')
        .order('pickup_time')

      if (bk) {
        setBookings(bk)
        const unassigned = bk.filter((b: any) => !b.driver_id).length
        const revenue = bk.reduce((sum: number, b: any) => sum + (b.final_price || 0), 0)
        const paid = bk.filter((b: any) => b.status === 'confirmed' || b.status === 'completed').length
        setStats({ today: bk.length, unassigned, rating: provider.avg_rating || 0, revenue, paid, total: bk.length })
      }

      const { data: dr } = await supabase.from('drivers').select('*').eq('provider_id', provider.id).eq('is_active', true)
      if (dr) setDrivers(dr)

      const { data: vh } = await supabase.from('vehicles').select('*').eq('provider_id', provider.id).eq('is_active', true)
      if (vh) setVehicles(vh)
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
        <h1 className="text-2xl font-medium mb-1">Today's overview</h1>
        <p className="text-sm text-muted mb-8">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { num: stats.today, label: 'Trips today', sub: `${stats.today - stats.unassigned} assigned` },
            { num: stats.unassigned, label: 'Unassigned', sub: 'Need a driver' },
            { num: stats.rating.toFixed(1) + '★', label: 'Avg. rating', sub: 'All time' },
            { num: `€ ${stats.revenue.toFixed(0)}`, label: 'Revenue today', sub: `${stats.paid} of ${stats.total} paid` },
          ].map(s => (
            <div key={s.label} className="bg-white/[0.03] border border-border rounded-lg p-4">
              <div className="text-2xl font-medium mb-1">{s.num}</div>
              <div className="text-xs tracking-widest text-muted uppercase">{s.label}</div>
              <div className="text-xs text-muted/50 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Bookings table */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xs tracking-widest text-muted uppercase">Today's bookings</h2>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-white/[0.02]">
                  {['Time', 'Route', 'Pax', 'Vehicle', 'Driver', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 ? (
                  <tr><td colSpan={7} className="text-center text-muted text-sm py-10">No bookings today</td></tr>
                ) : bookings.map((b: any) => (
                  <tr key={b.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                    <td className="px-4 py-3">
                      <div className="text-sm">{new Date(b.pickup_time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                      <div className="text-xs text-muted">{b.direction === 'outbound' ? '→ Out' : '← In'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm">{b.pickup?.name} → {b.dropoff?.name}</td>
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
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded capitalize ${statusBadge[b.status] ?? 'bg-white/10 text-muted'}`}>
                        {b.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!b.driver_id ? (
                        assigning === b.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              className="text-xs px-2 py-1 rounded"
                              value={selectedDriver[b.id] ?? ''}
                              onChange={e => setSelectedDriver(prev => ({ ...prev, [b.id]: e.target.value }))}
                            >
                              <option value="">Select driver</option>
                              {drivers.map((d: any) => (
                                <option key={d.id} value={d.id}>{d.full_name}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => selectedDriver[b.id] && assignDriver(b.id, selectedDriver[b.id])}
                              className="text-xs bg-paper text-ink px-2 py-1 rounded">
                              Assign
                            </button>
                            <button onClick={() => setAssigning(null)} className="text-xs text-muted">✕</button>
                          </div>
                        ) : (
                          <button onClick={() => setAssigning(b.id)}
                            className="text-xs bg-paper text-ink px-3 py-1.5 rounded hover:bg-paper/90 transition-colors">
                            Assign
                          </button>
                        )
                      ) : (
                        <button className="text-xs text-muted hover:text-paper transition-colors">Details</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fleet */}
        <div>
          <h2 className="text-xs tracking-widest text-muted uppercase mb-4">Fleet</h2>
          <div className="grid grid-cols-3 gap-3">
            {vehicles.map((v: any) => (
              <div key={v.id} className="bg-white/[0.03] border border-border rounded-lg p-4">
                <div className="text-xs tracking-widest text-muted uppercase mb-1">{v.type}</div>
                <div className="text-sm font-medium mb-1">{v.make} {v.model}</div>
                <div className="text-xs text-muted">{v.seats} pax · {v.luggage_capacity} bags · {v.plate_number}</div>
                <div className="mt-3 pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-xs bg-teal/15 text-teal px-2 py-0.5 rounded">Active</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProviderLayout>
  )
}
