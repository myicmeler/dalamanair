'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

function BookingContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient() as any
  const [lang] = useState<'en'|'tr'>('en')
  const [vehicle, setVehicle] = useState<any>(null)
  const [pickup, setPickup] = useState<any>(null)
  const [dropoff, setDropoff] = useState<any>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '', flightNumber: '', notes: ''
  })

  const vehicleId = params.get('vehicleId') ?? ''
  const pickupId = params.get('pickup') ?? ''
  const dropoffId = params.get('dropoff') ?? ''
  const tripType = params.get('tripType') ?? 'oneway'
  const price = parseFloat(params.get('price') ?? '0')
  const returnPrice = Math.round(price * 0.9)
  const discount = tripType === 'return' ? Math.round(price * 0.1) : 0
  const total = tripType === 'return' ? price + returnPrice : price

  useEffect(() => {
    async function load() {
      const [{ data: v }, { data: p }, { data: d }] = await Promise.all([
        supabase.from('vehicles').select('*').eq('id', vehicleId).single(),
        supabase.from('locations').select('*').eq('id', pickupId).single(),
        supabase.from('locations').select('*').eq('id', dropoffId).single(),
      ])
      if (v) setVehicle(v)
      if (p) setPickup(p)
      if (d) setDropoff(d)
    }
    if (vehicleId) load()
  }, [vehicleId])

  async function handlePay() {
    if (!form.firstName || !form.email || !form.phone) return
    setSubmitting(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const bookingParams = params.toString()
        router.push(`/auth/signin?redirect=${encodeURIComponent(`/booking?${bookingParams}`)}`)
        return
      }
      const { data: booking, error } = await supabase.from('bookings').insert({
        customer_id: user.id, vehicle_id: vehicleId,
        pickup_location_id: pickupId, dropoff_location_id: dropoffId,
        direction: 'outbound',
        pickup_time: `${params.get('date')}T${params.get('time')}:00`,
        passengers: parseInt(params.get('passengers') ?? '1'),
        luggage: 0, status: 'pending',
        price, discount_pct: tripType === 'return' ? 10 : 0, final_price: price,
        flight_number: form.flightNumber || null, customer_notes: form.notes || null,
      }).select().single()

      if (error || !booking) throw error

      if (tripType === 'return') {
        await supabase.from('bookings').insert({
          customer_id: user.id, vehicle_id: vehicleId,
          pickup_location_id: params.get('returnPickup') || dropoffId,
          dropoff_location_id: pickupId,
          direction: 'inbound', group_id: booking.group_id,
          pickup_time: `${params.get('returnDate')}T${params.get('returnTime')}:00`,
          passengers: parseInt(params.get('passengers') ?? '1'),
          luggage: 0, status: 'pending',
          price: returnPrice, discount_pct: 10, final_price: returnPrice,
        })
      }
      await supabase.from('payments').insert({
        booking_id: booking.id, amount: total, currency: 'EUR', status: 'pending',
      })
      router.push(`/confirmation?bookingId=${booking.id}&ref=DMR-${new Date().getFullYear()}-${booking.id.slice(0,5).toUpperCase()}`)
    } catch (err) {
      console.error('Booking error:', err)
      setSubmitting(false)
    }
  }

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: any) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  })

  return (
    <div className="min-h-screen bg-paper">
      <Nav lang={lang} />
      <div className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="text-3xl font-medium text-ink mb-8">Review & pay</h1>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_380px] gap-6">
          <div className="flex flex-col gap-4">
            <div className="bg-white border border-line rounded-md p-6">
              <p className="text-[10px] tracking-[0.2em] text-accent-2 uppercase mb-4">Outbound · {params.get('date')}</p>
              {[
                ['Route', `${pickup?.name ?? '...'} → ${dropoff?.name ?? '...'}`],
                ['Pick-up', params.get('time')],
                ['Vehicle', vehicle ? `${vehicle.make} ${vehicle.model}` : '...'],
                ['Passengers', params.get('passengers') ?? '1'],
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between py-2.5 border-b border-line last:border-0">
                  <span className="text-[13px] text-muted">{k}</span>
                  <span className="text-[13px] text-ink">{v}</span>
                </div>
              ))}
            </div>

            {tripType === 'return' && (
              <div className="bg-white border border-line rounded-md p-6">
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-[10px] tracking-[0.2em] text-accent-2 uppercase">Return · {params.get('returnDate')}</p>
                  <span className="text-[10px] bg-accent/20 text-ink px-2 py-0.5 rounded">10% T/R discount</span>
                </div>
                {[
                  ['Route', `${dropoff?.name ?? '...'} → ${pickup?.name ?? '...'}`],
                  ['Pick-up', params.get('returnTime')],
                  ['Vehicle', vehicle ? `${vehicle.make} ${vehicle.model}` : '...'],
                ].map(([k,v]) => (
                  <div key={k} className="flex justify-between py-2.5 border-b border-line last:border-0">
                    <span className="text-[13px] text-muted">{k}</span>
                    <span className="text-[13px] text-ink">{v}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white border border-line rounded-md p-6">
              <p className="text-[10px] tracking-[0.2em] text-accent-2 uppercase mb-4">Your details</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'First name *', key: 'firstName' as const, placeholder: 'Tom' },
                  { label: 'Last name *', key: 'lastName' as const, placeholder: 'Smith' },
                  { label: 'Email *', key: 'email' as const, placeholder: 'you@email.com' },
                  { label: 'Phone *', key: 'phone' as const, placeholder: '+44 7700...' },
                  { label: 'Flight number (optional)', key: 'flightNumber' as const, placeholder: 'TK 1234' },
                  { label: 'Notes (optional)', key: 'notes' as const, placeholder: 'Child seat needed...' },
                ].map(field => (
                  <div key={field.key} className="flex flex-col gap-1.5">
                    <label className="text-[10px] tracking-[0.1em] uppercase text-muted">{field.label}</label>
                    <input {...f(field.key)} placeholder={field.placeholder} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-line rounded-md p-6 h-fit">
            <p className="text-[10px] tracking-[0.2em] text-accent-2 uppercase mb-4">Price summary</p>
            <div className="flex flex-col gap-2.5 mb-4">
              <div className="flex justify-between text-[13px]">
                <span className="text-muted">Outbound · {vehicle ? `${vehicle.make} ${vehicle.model}` : '...'}</span>
                <span className="text-ink">€ {price.toFixed(2)}</span>
              </div>
              {tripType === 'return' && (<>
                <div className="flex justify-between text-[13px]">
                  <span className="text-muted">Return · {vehicle?.make} {vehicle?.model}</span>
                  <span className="text-ink">€ {price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[13px] text-teal">
                  <span>T/R discount (10%)</span>
                  <span>− € {discount.toFixed(2)}</span>
                </div>
              </>)}
            </div>
            <div className="flex justify-between text-lg font-medium text-ink pt-4 border-t border-line mb-5">
              <span>Total</span>
              <span>€ {total.toFixed(2)}</span>
            </div>
            <div className="flex flex-col gap-2 mb-4">
              <p className="text-[10px] tracking-[0.2em] uppercase text-muted">Payment</p>
              <div className="px-4 py-3 border border-line rounded text-[12px] text-muted">Card number · · · · · · · ·</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="px-4 py-3 border border-line rounded text-[12px] text-muted">MM / YY</div>
                <div className="px-4 py-3 border border-line rounded text-[12px] text-muted">CVC</div>
              </div>
            </div>
            <button onClick={handlePay}
              disabled={submitting || !form.firstName || !form.email || !form.phone}
              className="w-full bg-accent hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed text-ink font-medium text-[12px] tracking-[0.08em] uppercase py-3 rounded transition-colors">
              {submitting ? 'Processing...' : `Pay € ${total.toFixed(2)} →`}
            </button>
            <p className="text-center text-[10px] text-muted mt-3 tracking-wider uppercase">Secured by Stripe · SSL</p>
          </div>
        </div>
        <button onClick={() => router.back()} className="mt-6 text-[13px] text-muted hover:text-ink transition-colors">
          ← Back to vehicles
        </button>
      </div>
    </div>
  )
}

export default function BookingPage() {
  return <Suspense fallback={<div className="min-h-screen bg-paper"/>}><BookingContent /></Suspense>
}
