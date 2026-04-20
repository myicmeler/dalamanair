'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

function SearchContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [vehicles, setVehicles] = useState<any[]>([])
  const [locations, setLocations] = useState<Record<string, any>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState<'price'|'rating'|'capacity'>('price')

  const tripType = params.get('tripType') ?? 'oneway'
  const passengers = parseInt(params.get('passengers') ?? '1')
  const pickupId = params.get('pickup') ?? ''
  const dropoffId = params.get('dropoff') ?? ''

  useEffect(() => {
    async function load() {
      const { data: locs } = await supabase.from('locations').select('*')
      if (locs) {
        const map: Record<string, any> = {}
        locs.forEach((l: any) => { map[l.id] = l })
        setLocations(map)
      }
      const { data } = await supabase
        .from('vehicles')
        .select('*, provider:providers(company_name, avg_rating, total_reviews)')
        .eq('is_active', true)
        .gte('seats', passengers)
        .order('seats')
      if (data) setVehicles(data)
      setLoading(false)
    }
    load()
  }, [passengers])

  function getPrice(v: any) {
    const base: Record<string, number> = { sedan: 29, minivan: 45, minibus: 72, luxury: 89, suv: 55 }
    return base[v.type] ?? 45
  }

  function getSortedVehicles() {
    return [...vehicles].sort((a, b) => {
      if (sort === 'price') return getPrice(a) - getPrice(b)
      if (sort === 'rating') return (b.provider?.avg_rating ?? 0) - (a.provider?.avg_rating ?? 0)
      if (sort === 'capacity') return b.seats - a.seats
      return 0
    })
  }

  function handleSelect(vehicleId: string) {
    if (selected === vehicleId) {
      const p = new URLSearchParams(params.toString())
      p.set('vehicleId', vehicleId)
      p.set('price', String(getPrice(vehicles.find((v: any) => v.id === vehicleId)!)))
      router.push(`/booking?${p.toString()}`)
    } else {
      setSelected(vehicleId)
    }
  }

  const pickup = locations[pickupId]
  const dropoff = locations[dropoffId]

  return (
    <div className="min-h-screen bg-paper">
      <Nav lang={lang} onLangChange={setLang} />
      <div className="max-w-5xl mx-auto px-8 py-10">
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-[11px] tracking-[0.25em] text-accent-2 uppercase mb-2">
              {params.get('date')} · {params.get('time')} · {passengers} {passengers > 1 ? (lang === 'en' ? 'passengers' : 'yolcu') : (lang === 'en' ? 'passenger' : 'yolcu')}
              {tripType === 'return' ? (lang === 'en' ? ' · Return' : ' · Gidiş-dönüş') : ''}
            </p>
            <h1 className="text-3xl md:text-4xl font-medium text-ink">
              {pickup?.name ?? '...'} → {dropoff?.name ?? '...'}
            </h1>
          </div>
          <button onClick={() => router.back()} className="text-[13px] text-muted hover:text-ink transition-colors">
            ← {lang === 'en' ? 'Edit search' : 'Aramayı düzenle'}
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <span className="text-[11px] tracking-widest text-muted uppercase mr-2">Sort</span>
          {(['price','rating','capacity'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)}
              className={`text-[11px] px-3 py-1.5 rounded border transition-all capitalize ${
                sort === s ? 'border-ink bg-ink text-white' : 'border-line text-sub hover:border-sub'
              }`}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div className="text-muted text-[13px] py-20 text-center">Loading available vehicles...</div>
        ) : vehicles.length === 0 ? (
          <div className="text-muted text-[13px] py-20 text-center">No vehicles available for {passengers} passengers.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {getSortedVehicles().map((v: any) => {
              const price = getPrice(v)
              const returnPrice = Math.round(price * 0.9)
              const isSelected = selected === v.id
              const rating = v.provider?.avg_rating ?? 0
              const reviews = v.provider?.total_reviews ?? 0
              return (
                <div key={v.id} onClick={() => handleSelect(v.id)}
                  className={`bg-white border rounded-md px-6 py-5 grid grid-cols-[1fr_auto] gap-6 items-center cursor-pointer transition-all ${
                    isSelected ? 'border-accent panel-shadow' : 'border-line hover:border-sub'
                  }`}>
                  <div>
                    <p className="text-[10px] tracking-[0.2em] text-muted uppercase mb-1">{v.type}</p>
                    <p className="text-[17px] font-medium text-ink mb-1">{v.make} {v.model}</p>
                    <div className="flex gap-3 text-[12px] text-sub mb-2">
                      <span>Up to {v.seats} passengers</span>
                      <span className="text-line">·</span>
                      <span>{v.luggage_capacity} suitcases</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => (
                          <div key={i} className={`w-2.5 h-2.5 ${i <= Math.round(rating) ? 'bg-accent' : 'bg-line'}`}
                            style={{ clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }} />
                        ))}
                      </div>
                      <span className="text-[11px] text-sub">{rating.toFixed(1)} ({reviews})</span>
                      <span className="text-[11px] text-muted ml-2">· {v.provider?.company_name}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-medium text-ink">€ {price}</p>
                    {tripType === 'return' && <p className="text-[11px] text-sub mb-3">+ € {returnPrice} return</p>}
                    <button className={`text-[11px] px-4 py-2 rounded font-medium tracking-wider uppercase transition-all ${
                      isSelected ? 'bg-accent text-ink' : 'border border-line text-sub hover:border-sub'
                    }`}>{isSelected ? 'Continue →' : 'Select'}</button>
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

export default function SearchPage() {
  return <Suspense fallback={<div className="min-h-screen bg-paper"/>}><SearchContent /></Suspense>
}
