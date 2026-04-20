'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

export default function MyBookings() {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming'|'past'|'all'>('upcoming')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin?redirect=/bookings')
        return
      }
      const { data } = await supabase
        .from('bookings')
        .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), vehicle:vehicles(make, model, type), driver:drivers(full_name, phone), provider:providers(company_name)')
        .eq('customer_id', user.id)
        .order('pickup_time', { ascending: false })
      if (data) setBookings(data)
      setLoading(false)
    }
    load()
  }, [])

  const now = new Date()
  const filtered = bookings.filter((b: any) => {
    const bookingDate = new Date(b.pickup_time)
    if (filter === 'upcoming') return bookingDate >= now && b.status !== 'cancelled'
    if (filter === 'past') return bookingDate < now || b.status === 'completed'
    return true
  })

  const statusBadge: Record<string, string> = {
    pending: 'bg-amber/15 text-amber',
    confirmed: 'bg-teal/15 text-teal',
    driver_assigned: 'bg-blue/15 text-blue',
    in_progress: 'bg-blue/15 text-blue',
    completed: 'bg-white/10 text-muted',
    cancelled: 'bg-red-900/20 text-red-400',
  }

  const statusLabel: Record<string, string> = {
    pending: lang === 'en' ? 'Awaiting confirmation' : 'Onaylanıyor',
    confirmed: lang === 'en' ? 'Confirmed' : 'Onaylandı',
    driver_assigned: lang === 'en' ? 'Driver assigned' : 'Sürücü atandı',
    in_progress: lang === 'en' ? 'In progress' : 'Devam ediyor',
    completed: lang === 'en' ? 'Completed' : 'Tamamlandı',
    cancelled: lang === 'en' ? 'Cancelled' : 'İptal edildi',
  }

  return (
    <div className="min-h-screen bg-paper">
      <Nav lang={lang} onLangChange={setLang} />
      <div className="max-w-4xl mx-auto px-8 py-10">
        <div className="mb-8">
          <p className="text-[11px] tracking-[0.25em] text-accent-2 uppercase mb-2">
            {lang === 'en' ? 'Your trips' : 'Seyahatleriniz'}
          </p>
          <h1 className="text-3xl md:text-4xl font-medium text-ink">
            {lang === 'en' ? 'My bookings' : 'Rezervasyonlarım'}
          </h1>
        </div>

        <div className="flex gap-2 mb-6">
          {(['upcoming','past','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-[11px] px-4 py-2 rounded border capitalize transition-all ${
                filter === f ? 'border-ink bg-ink text-white' : 'border-line text-sub hover:border-sub'
              }`}>
              {lang === 'en' ? f : (f === 'upcoming' ? 'Yaklaşan' : f === 'past' ? 'Geçmiş' : 'Tümü')}
            </button>
          ))}
          <span className="text-[11px] text-muted self-center ml-2">
            {filtered.length} {lang === 'en' ? 'bookings' : 'rezervasyon'}
          </span>
        </div>

        {loading ? (
          <div className="text-muted text-[13px] py-20 text-center">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-line rounded-md p-12 text-center">
            <p className="text-muted text-[14px] mb-4">
              {filter === 'upcoming' 
                ? (lang === 'en' ? 'No upcoming trips.' : 'Yaklaşan seyahat yok.')
                : (lang === 'en' ? 'No bookings found.' : 'Rezervasyon bulunamadı.')}
            </p>
            <Link href="/" className="inline-block text-[11px] tracking-wider uppercase bg-accent hover:bg-accent-2 text-ink font-medium px-5 py-2.5 rounded transition-colors">
              {lang === 'en' ? 'Book a transfer' : 'Transfer rezerve et'} →
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((b: any) => {
              const bookingDate = new Date(b.pickup_time)
              const isUpcoming = bookingDate >= now && b.status !== 'cancelled'
              return (
                <div key={b.id} className="bg-white border border-line rounded-md p-5 grid grid-cols-[auto_1fr_auto] gap-5 items-center">
                  <div className="text-center min-w-[70px]">
                    <div className="text-[10px] tracking-widest text-muted uppercase">
                      {bookingDate.toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', { month: 'short' })}
                    </div>
                    <div className="text-3xl font-medium text-ink my-0.5">
                      {bookingDate.getDate()}
                    </div>
                    <div className="text-[11px] text-muted">
                      {bookingDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  <div className="border-l border-line pl-5">
                    <div className="text-[15px] font-medium text-ink mb-1">
                      {b.pickup?.name ?? '...'} → {b.dropoff?.name ?? '...'}
                    </div>
                    <div className="flex gap-3 text-[12px] text-sub mb-2">
                      <span>{b.vehicle ? `${b.vehicle.make} ${b.vehicle.model}` : '—'}</span>
                      <span className="text-line">·</span>
                      <span>{b.passengers} {lang === 'en' ? (b.passengers === 1 ? 'passenger' : 'passengers') : 'yolcu'}</span>
                      {b.provider?.company_name && <>
                        <span className="text-line">·</span>
                        <span className="text-muted">{b.provider.company_name}</span>
                      </>}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-[11px] px-2 py-1 rounded ${statusBadge[b.status] ?? 'bg-white/10 text-muted'}`}>
                        {statusLabel[b.status] ?? b.status}
                      </span>
                      {b.driver && (
                        <span className="text-[11px] text-muted">
                          {lang === 'en' ? 'Driver:' : 'Sürücü:'} {b.driver.full_name}
                          {isUpcoming && b.driver.phone && (
                            <a href={`tel:${b.driver.phone}`} className="text-ink ml-2 underline hover:text-accent-2">
                              {b.driver.phone}
                            </a>
                          )}
                        </span>
                      )}
                      {b.flight_number && (
                        <span className="text-[11px] text-muted">
                          {lang === 'en' ? 'Flight:' : 'Uçuş:'} <span className="text-ink">{b.flight_number}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xl font-medium text-ink">€ {b.final_price?.toFixed(2)}</div>
                    <div className="text-[10px] tracking-widest text-muted uppercase mt-1">
                      {b.direction === 'outbound' 
                        ? (lang === 'en' ? 'Outbound' : 'Gidiş')
                        : (lang === 'en' ? 'Return' : 'Dönüş')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-10 text-center">
          <Link href="/" className="text-[13px] text-muted hover:text-ink transition-colors">
            ← {lang === 'en' ? 'Book another transfer' : 'Başka transfer rezerve et'}
          </Link>
        </div>
      </div>
    </div>
  )
}
