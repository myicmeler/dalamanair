'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'
import type { Location } from '@/types/database'

const labels = {
  en: {
    eyebrow: 'Içmeler · Marmaris · Dalaman',
    title: 'Book your\ntransfer.',
    sub: 'Airport transfers across the Marmaris & Içmeler region.',
    oneWay: 'One way', return: 'Return',
    pickup: 'Pick-up', dropoff: 'Drop-off',
    date: 'Outbound date & time', returnDate: 'Return date & time',
    returnPickup: 'Return pick-up',
    pax: 'Passengers', search: 'Search transfers',
    selectDest: 'Select destination',
  },
  tr: {
    eyebrow: 'İçmeler · Marmaris · Dalaman',
    title: 'Transferinizi\nkolayca ayarlayın.',
    sub: 'Marmaris ve İçmeler bölgesinde havalimanı transferleri.',
    oneWay: 'Tek yön', return: 'Gidiş-dönüş',
    pickup: 'Alış noktası', dropoff: 'Bırakma noktası',
    date: 'Gidiş tarih & saat', returnDate: 'Dönüş tarih & saat',
    returnPickup: 'Dönüş alış noktası',
    pax: 'Yolcu sayısı', search: 'Transfer ara',
    selectDest: 'Hedef seçin',
  }
}

export default function HomePage() {
  const router = useRouter()
  const supabase = createClient()
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [tripType, setTripType] = useState<'oneway'|'return'>('return')
  const [locations, setLocations] = useState<Location[]>([])
  const [form, setForm] = useState({
    pickup: '', dropoff: '',
    outboundDate: '', outboundTime: '14:00',
    returnDate: '', returnTime: '10:00',
    returnPickup: '',
    passengers: '2',
  })

  const t = labels[lang]

  useEffect(() => {
    supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .then(({ data }) => { if (data) setLocations(data) })
  }, [])

  function handleSearch() {
    const params = new URLSearchParams({
      pickup: form.pickup,
      dropoff: form.dropoff,
      date: form.outboundDate,
      time: form.outboundTime,
      passengers: form.passengers,
      tripType,
      ...(tripType === 'return' ? {
        returnDate: form.returnDate,
        returnTime: form.returnTime,
        returnPickup: form.returnPickup || form.dropoff,
      } : {})
    })
    router.push(`/search?${params.toString()}`)
  }

  const airports = locations.filter(l => l.type === 'airport')
  const destinations = locations.filter(l => l.type !== 'airport')

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav lang={lang} onLangChange={setLang} />

      <div className="px-10 pt-16 pb-12 max-w-4xl">

        {/* Eyebrow */}
        <p className="text-xs tracking-widest text-paper/30 uppercase mb-5">
          {t.eyebrow}
        </p>

        {/* Hero title */}
        <h1 className="text-6xl font-medium leading-tight mb-4 whitespace-pre-line">
          {t.title}
        </h1>
        <p className="text-sm text-muted mb-10 max-w-md leading-relaxed">
          {t.sub}
        </p>

        {/* Search card */}
        <div className="bg-white/[0.03] border border-border rounded-xl p-6">

          {/* One way / Return toggle */}
          <div className="flex gap-0.5 bg-white/5 rounded p-0.5 w-fit mb-5">
            {(['oneway','return'] as const).map(type => (
              <button
                key={type}
                onClick={() => setTripType(type)}
                className={`text-sm px-5 py-2 rounded transition-all ${
                  tripType === type
                    ? 'bg-white/10 text-paper'
                    : 'text-muted hover:text-paper'
                }`}
              >
                {type === 'oneway' ? t.oneWay : t.return}
              </button>
            ))}
          </div>

          {/* Main fields */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest text-paper/30 uppercase">{t.pickup}</label>
              <select
                className="px-3 py-2.5 text-sm"
                value={form.pickup}
                onChange={e => setForm(f => ({ ...f, pickup: e.target.value }))}
              >
                <option value="">— Select —</option>
                {airports.map(l => (
                  <option key={l.id} value={l.id}>
                    {lang === 'tr' && l.name_tr ? l.name_tr : l.name}
                    {l.iata_code ? ` (${l.iata_code})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest text-paper/30 uppercase">{t.dropoff}</label>
              <select
                className="px-3 py-2.5 text-sm"
                value={form.dropoff}
                onChange={e => setForm(f => ({ ...f, dropoff: e.target.value }))}
              >
                <option value="">{t.selectDest}</option>
                {destinations.map(l => (
                  <option key={l.id} value={l.id}>
                    {lang === 'tr' && l.name_tr ? l.name_tr : l.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest text-paper/30 uppercase">{t.date}</label>
              <div className="flex gap-1">
                <input
                  type="date"
                  className="px-3 py-2.5 text-sm flex-1"
                  value={form.outboundDate}
                  onChange={e => setForm(f => ({ ...f, outboundDate: e.target.value }))}
                />
                <input
                  type="time"
                  className="px-2 py-2.5 text-sm w-24"
                  value={form.outboundTime}
                  onChange={e => setForm(f => ({ ...f, outboundTime: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs tracking-widest text-paper/30 uppercase">{t.pax}</label>
              <select
                className="px-3 py-2.5 text-sm"
                value={form.passengers}
                onChange={e => setForm(f => ({ ...f, passengers: e.target.value }))}
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Return fields */}
          {tripType === 'return' && (
            <div className="grid grid-cols-2 gap-3 mb-5 p-4 bg-white/[0.02] border border-border rounded-lg">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest text-paper/30 uppercase">{t.returnDate}</label>
                <div className="flex gap-1">
                  <input
                    type="date"
                    className="px-3 py-2.5 text-sm flex-1"
                    value={form.returnDate}
                    onChange={e => setForm(f => ({ ...f, returnDate: e.target.value }))}
                  />
                  <input
                    type="time"
                    className="px-2 py-2.5 text-sm w-24"
                    value={form.returnTime}
                    onChange={e => setForm(f => ({ ...f, returnTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs tracking-widest text-paper/30 uppercase">{t.returnPickup}</label>
                <select
                  className="px-3 py-2.5 text-sm"
                  value={form.returnPickup}
                  onChange={e => setForm(f => ({ ...f, returnPickup: e.target.value }))}
                >
                  <option value="">{t.selectDest}</option>
                  {destinations.map(l => (
                    <option key={l.id} value={l.id}>
                      {lang === 'tr' && l.name_tr ? l.name_tr : l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <button
            onClick={handleSearch}
            disabled={!form.pickup || !form.dropoff || !form.outboundDate}
            className="w-full bg-paper text-ink py-3.5 rounded-lg text-sm font-medium
                       hover:bg-paper/90 transition-colors
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {t.search}
          </button>
        </div>

        {/* Stats strip */}
        <div className="flex gap-10 mt-10">
          {[
            { num: '4.8★', label: 'Average rating' },
            { num: '2,400+', label: 'Transfers completed' },
            { num: '3', label: 'Vehicle types' },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl font-medium text-paper/10">{s.num}</div>
              <div className="text-xs text-paper/25 mt-1 tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
