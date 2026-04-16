'use client'
import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'
import type { Vehicle, Location } from '@/types/database'

const vehicleLabels: Record<string, string> = {
  sedan: 'Sedan', minivan: 'Minivan', minibus: 'Minibus',
  luxury: 'Luxury', suv: 'SUV'
}

const featureLabels: Record<string, string> = {
  ac: 'A/C', wifi: 'Wi-Fi', child_seat: 'Child seat available'
}

type VehicleWithProvider = Vehicle & {
  provider: { company_name: string; avg_rating: number; total_reviews: number }
}

export default function SearchPage() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const [lang] = useState<'en'|'tr'>('en')
  const [vehicles, setVehicles] = useState<VehicleWithProvider[]>([])
  const [locations, setLocations] = useState<Record<string, Location>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'price'|'rating'|'capacity'>('price')

  const tripType   = params.get('tripType') ?? 'oneway'
  const passengers = parseInt(params.get('passengers') ?? '1')
  const pickupId   = params.get('pickup') ?? ''
  const dropoffId  = params.get('dropoff') ?? ''

  useEffect(() => {
    async function load() {
      // Load locations for display
      const { data: locs } = await supabase
        .from('locations').select('*')
      if (locs) {
        const map: Record<string, Location> = {}
        locs.forEach(l => { map[l.id] = l })
        setLocations(map)
      }

      // Load vehicles that fit passenger count
      const { data } = await supabase
        .from('vehicles')
        .select(`
          *,
          provider:providers(company_name, avg_rating, total_reviews)
        `)
        .eq('is_active', true)
        .gte('seats', passengers)
        .order('seats')

      if (data) setVehicles(data as VehicleWithProvider[])
      setLoading(false)
    }
    load()
  }, [passengers])

  // Pricing — simple per-seat base rate, real pricing comes from provider config
  function getPrice(v: Vehicle) {
    const base: Record<string, number> = {
      sedan: 29, minivan: 45, minibus: 72, luxury: 89, suv: 55
    }
    return base[v.type] ?? 45
  }

  function getSortedVehicles() {
    return [...vehicles].sort((a, b) => {
      if (sort === 'price')    return getPrice(a) - getPrice(b)
      if (sort === 'rating')   return (b.provider?.avg_rating ?? 0) - (a.provider?.avg_rating ?? 0)
      if (sort === 'capacity') return b.seats - a.seats
      return 0
    })
  }

  function handleSelect(vehicleId: string) {
    if (selected === vehicleId) {
      // Proceed to booking
      const p = new URLSearchParams(params.toString())
      p.set('vehicleId', vehicleId)
      p.set('price', String(getPrice(vehicles.find(v => v.id === vehicleId)!)))
      router.push(`/booking?${p.toString()}`)
    } else {
      setSelected(vehicleId)
    }
  }

  const pickup  = locations[pickupId]
  const dropoff = locations[dropoffId]

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav lang={lang} />

      <div className="px-10 py-8 max-w-4xl">

        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-medium">
              {pickup?.name ?? '...'} → {dropoff?.name ?? '...'}
            </h1>
            <p className="text-sm text-muted mt-1">
              {params.get('date')} · {params.get('time')} · {passengers} passenger{passengers > 1 ? 's' : ''}
              {tripType === 'return' ? ' · Return' : ''}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="text-sm text-muted hover:text-paper transition-colors"
          >
            ← Edit search
          </button>
        </div>

        {/* Sort tabs */}
        <div className="flex gap-2 mb-5">
          {(['price','rating','capacity'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-xs px-3 py-1.5 rounded border transition-all capitalize ${
                sort === s
                  ? 'border-paper/35 text-paper'
                  : 'border-border text-muted hover:text-paper'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Vehicle cards */}
        {loading ? (
          <div className="text-muted text-sm py-20 text-center">Loading available vehicles...</div>
        ) : vehicles.length === 0 ? (
          <div className="text-muted text-sm py-20 text-center">
            No vehicles available for {passengers} passengers on this route.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {getSortedVehicles().map(v => {
              const price      = getPrice(v)
              const returnPrice = Math.round(price * 0.9)
              const isSelected = selected === v.id
              const rating     = v.provider?.avg_rating ?? 0
              const reviews    = v.provider?.total_reviews ?? 0

              return (
                <div
                  key={v.id}
                  onClick={() => handleSelect(v.id)}
                  className={`border rounded-lg px-6 py-5 grid grid-cols-[1fr_auto] gap-4 items-center
                    cursor-pointer transition-all ${
                    isSelected
                      ? 'border-paper/50 bg-white/[0.04]'
                      : 'border-border hover:border-paper/25 hover:bg-white/[0.02]'
                  }`}
                >
                  <div>
                    <p className="text-xs tracking-widest text-muted uppercase mb-1">
                      {vehicleLabels[v.type]}
                      {v.type === 'minivan' ? ' · Most popular' : ''}
                    </p>
                    <p className="text-lg font-medium mb-1">{v.make} {v.model}</p>
                    <div className="flex gap-4 text-xs text-muted mb-2">
                      <span>Up to {v.seats} passengers</span>
                      <span>·</span>
                      <span>{v.luggage_capacity} suitcases</span>
                      {v.features.map(f => (
                        <span key={f}>· {featureLabels[f] ?? f}</span>
                      ))}
                    </div>
                    {/* Stars */}
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div
                            key={i}
                            className={`w-2.5 h-2.5 ${
                              i <= Math.round(rating)
                                ? 'opacity-80'
                                : 'opacity-15'
                            }`}
                            style={{
                              background: 'currentColor',
                              clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'
                            }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted">
                        {rating.toFixed(1)} ({reviews} reviews)
                      </span>
                    </div>
                    <p className="text-xs text-muted mt-1">{v.provider?.company_name}</p>
                  </div>

                  <div className="text-right">
                    <p className="text-2xl font-medium">€ {price}</p>
                    {tripType === 'return' && (
                      <p className="text-xs text-muted mb-3">+ € {returnPrice} return</p>
                    )}
                    <button
                      className={`text-xs px-4 py-2 rounded border transition-all ${
                        isSelected
                          ? 'bg-paper text-ink border-paper'
                          : 'border-border text-muted hover:border-paper/35 hover:text-paper'
                      }`}
                    >
                      {isSelected ? 'Continue →' : 'Select'}
                    </button>
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
