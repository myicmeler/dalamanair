'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function DriverView() {
  const router = useRouter()
  const supabase = createClient() as any
  const [driver, setDriver] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState<string | null>(null)
  const [selectedDay, setSelectedDay] = useState<'today'|'tomorrow'|'all'>('today')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin?redirect=/driver')
        return
      }
      const { data: drv } = await supabase
        .from('drivers')
        .select('*, provider:providers(company_name)')
        .eq('user_id', user.id)
        .single()

      if (!drv) {
        setLoading(false)
        return
      }
      setDriver(drv)

      const { data: bk } = await supabase
        .from('bookings')
        .select('*, pickup:locations!pickup_location_id(name, address), dropoff:locations!dropoff_location_id(name, address), customer:users(full_name, phone)')
        .eq('driver_id', drv.id)
        .in('status', ['driver_assigned', 'in_progress', 'confirmed'])
        .order('pickup_time', { ascending: true })
      if (bk) setBookings(bk)
      setLoading(false)
    }
    load()
  }, [])

  async function markComplete(bookingId: string) {
    setCompleting(bookingId)
    await supabase.from('bookings').update({
      status: 'completed',
      completed_at: new Date().toISOString()
    }).eq('id', bookingId)
    setBookings(prev => prev.filter(b => b.id !== bookingId))
    setCompleting(null)
  }

  async function markInProgress(bookingId: string) {
    await supabase.from('bookings').update({ status: 'in_progress' }).eq('id', bookingId)
    setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'in_progress' } : b))
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayAfter = new Date(tomorrow)
  dayAfter.setDate(dayAfter.getDate() + 1)

  const filtered = bookings.filter(b => {
    const bd = new Date(b.pickup_time)
    if (selectedDay === 'today') return bd >= today && bd < tomorrow
    if (selectedDay === 'tomorrow') return bd >= tomorrow && bd < dayAfter
    return true
  })

  if (loading) {
    return <div className="min-h-screen bg-ink text-muted flex items-center justify-center text-sm">Loading...</div>
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-ink text-paper flex items-center justify-center p-6">
        <div className="text-center max-w-xs">
          <h1 className="text-xl font-medium mb-3">Not a driver account</h1>
          <p className="text-sm text-muted mb-6">Your account isn&apos;t linked to a driver profile. Ask your provider to set you up.</p>
          <button onClick={handleSignOut} className="text-sm text-accent underline">Sign out</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-ink text-paper">
      <div className="sticky top-0 bg-ink/95 backdrop-blur-sm border-b border-white/10 px-5 py-4 flex items-center justify-between z-10">
        <div>
          <div className="text-[10px] tracking-widest text-muted uppercase">Driver</div>
          <div className="text-base font-medium">{driver.full_name}</div>
        </div>
        <button onClick={handleSignOut} className="text-xs text-muted hover:text-paper">Sign out</button>
      </div>

      <div className="px-5 py-4">
        <div className="flex gap-2 mb-5">
          {(['today','tomorrow','all'] as const).map(d => (
            <button key={d} onClick={() => setSelectedDay(d)}
              className={`flex-1 text-xs py-2 rounded border capitalize transition-all ${
                selectedDay === d ? 'bg-accent text-ink border-accent font-medium' : 'border-white/15 text-muted'
              }`}>{d}</button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">🌴</div>
            <p className="text-sm text-muted">No trips {selectedDay === 'today' ? 'today' : selectedDay === 'tomorrow' ? 'tomorrow' : 'assigned'}.</p>
            <p className="text-xs text-muted/60 mt-1">Enjoy your break!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((b: any, i: number) => {
              const bd = new Date(b.pickup_time)
              const mapUrl = b.pickup?.address
                ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.pickup.address)}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(b.pickup?.name ?? '')}`
              return (
                <div key={b.id} className="bg-white/[0.04] border border-white/10 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-[10px] tracking-widest text-accent uppercase">
                        Trip {i + 1} · {bd.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="text-2xl font-medium mt-0.5">
                        {bd.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] tracking-widest text-muted uppercase">Pax</div>
                      <div className="text-lg font-medium">{b.passengers}</div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 mb-3">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[10px] tracking-widest text-muted uppercase">Pick up</div>
                        <div className="text-sm font-medium">{b.pickup?.name ?? '—'}</div>
                        {b.pickup?.address && <div className="text-xs text-muted mt-0.5">{b.pickup.address}</div>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 w-2 h-2 rounded-full bg-white/20 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="text-[10px] tracking-widest text-muted uppercase">Drop off</div>
                        <div className="text-sm font-medium">{b.dropoff?.name ?? '—'}</div>
                        {b.dropoff?.address && <div className="text-xs text-muted mt-0.5">{b.dropoff.address}</div>}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-3 mb-3">
                    <div className="text-[10px] tracking-widest text-muted uppercase mb-1.5">Customer</div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm">{b.customer?.full_name ?? '—'}</div>
                      {b.customer?.phone && (
                        <a href={`tel:${b.customer.phone}`} className="text-xs bg-white/10 hover:bg-white/15 px-3 py-1.5 rounded transition-colors">
                          📞 {b.customer.phone}
                        </a>
                      )}
                    </div>
                    {b.flight_number && (
                      <div className="text-xs text-muted mt-1">Flight: <span className="text-paper">{b.flight_number}</span></div>
                    )}
                    {b.customer_notes && (
                      <div className="text-xs text-accent/90 mt-2 bg-accent/10 p-2 rounded border-l-2 border-accent">
                        📝 {b.customer_notes}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <a href={mapUrl} target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-xs bg-white/10 hover:bg-white/15 text-paper py-2.5 rounded text-center transition-colors">
                      🧭 Navigate
                    </a>
                    {b.status === 'driver_assigned' ? (
                      <button onClick={() => markInProgress(b.id)}
                        className="flex-1 text-xs bg-blue/20 text-blue py-2.5 rounded hover:bg-blue/30 transition-colors">
                        Start trip
                      </button>
                    ) : b.status === 'in_progress' ? (
                      <button onClick={() => markComplete(b.id)} disabled={completing === b.id}
                        className="flex-1 text-xs bg-accent text-ink font-medium py-2.5 rounded hover:bg-accent-2 transition-colors disabled:opacity-50">
                        {completing === b.id ? 'Saving...' : '✓ Complete'}
                      </button>
                    ) : (
                      <div className="flex-1 text-xs text-center py-2.5 text-muted">
                        {b.status?.replace('_', ' ')}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
