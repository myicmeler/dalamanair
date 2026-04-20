'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

const labels = {
  en: {
    tag: 'Içmeler · Marmaris · Dalaman',
    h1a: 'Airport transfers,', h1b: 'done properly.',
    sub: 'Private cars, English-speaking drivers, fixed prices. From Dalaman airport to your hotel door in under an hour.',
    oneway: 'One way', return: 'Return',
    pickup: 'Pick-up', dropoff: 'Drop-off',
    date: 'Date & time', passengers: 'Passengers',
    returnDate: 'Return date & time', returnFrom: 'Return pick-up',
    search: 'Search transfers',
    rating: 'Average rating', transfers: 'Transfers completed',
    support: 'English support', pricing: 'No surge pricing',
    why: 'Why book with us',
    w1t: 'Fixed prices', w1d: 'The price you see is what you pay. No hidden fees, no surcharges.',
    w2t: 'Meet & greet', w2d: 'Your driver meets you at arrivals with a name board. Flight delays? We track it.',
    w3t: '24/7 support', w3d: 'English and Turkish speaking support team, available any time you need us.',
  },
  tr: {
    tag: 'İçmeler · Marmaris · Dalaman',
    h1a: 'Havalimanı transferi,', h1b: 'doğru yapılmış.',
    sub: 'Özel araçlar, İngilizce konuşan sürücüler, sabit fiyat. Dalaman havalimanından otelinize bir saatten kısa sürede.',
    oneway: 'Tek yön', return: 'Gidiş-dönüş',
    pickup: 'Alış', dropoff: 'Varış',
    date: 'Tarih ve saat', passengers: 'Yolcular',
    returnDate: 'Dönüş tarihi ve saati', returnFrom: 'Dönüş alış',
    search: 'Transfer ara',
    rating: 'Ortalama puan', transfers: 'Tamamlanan transfer',
    support: 'İngilizce destek', pricing: 'Sürpriz fiyat yok',
    why: 'Neden biz',
    w1t: 'Sabit fiyatlar', w1d: 'Gördüğünüz fiyat ödediğiniz fiyattır. Gizli ücret ve ek ücret yok.',
    w2t: 'Karşılama hizmeti', w2d: 'Sürücünüz varışta isim tabelasıyla sizi karşılar. Uçak gecikmesi mi? Biz takip ederiz.',
    w3t: '7/24 destek', w3d: 'İngilizce ve Türkçe konuşan destek ekibi, ihtiyaç duyduğunuzda.',
  }
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const t = labels[lang]
  const [locations, setLocations] = useState<any[]>([])
  const [tripType, setTripType] = useState<'oneway'|'return'>('oneway')
  const [form, setForm] = useState({
    pickup: '', dropoff: '', date: '', time: '14:00',
    passengers: '2',
    returnDate: '', returnTime: '10:00', returnPickup: '',
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('locations').select('*').eq('is_active', true).order('sort_order').order('name')
      if (data) setLocations(data)
    }
    load()
  }, [])

  const airports = locations.filter(l => l.type === 'airport')
  const destinations = locations.filter(l => l.type !== 'airport')

  const canSearch = form.pickup && form.dropoff && form.date && form.time
    && (tripType === 'oneway' || (form.returnDate && form.returnTime && form.returnPickup))

  function handleSearch() {
    const params = new URLSearchParams({
      tripType, pickup: form.pickup, dropoff: form.dropoff,
      date: form.date, time: form.time, passengers: form.passengers,
    })
    if (tripType === 'return') {
      params.set('returnDate', form.returnDate)
      params.set('returnTime', form.returnTime)
      params.set('returnPickup', form.returnPickup)
    }
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="relative">
        <Nav lang={lang} onLangChange={setLang} variant="overlay" />
        <div className="absolute inset-0 -z-10" style={{backgroundColor:'#0f1419'}} />

        <div className="relative px-8 md:px-12 py-14 md:py-20 max-w-7xl mx-auto grid md:grid-cols-[1fr_420px] gap-10 items-center min-h-[520px]">
         <div style={{color:'#ffffff'}}>
           <p className="text-[11px] tracking-[0.25em] uppercase mb-5" style={{color:'#f4b942'}}>{t.tag}</p>
            <h1 className="text-5xl md:text-6xl font-normal leading-[1.05] mb-5">
              {t.h1a}<br/><em className="not-italic text-accent font-medium">{t.h1b}</em>
            </h1>
            <p className="text-[14px] text-white/75 max-w-md leading-relaxed">{t.sub}</p>
          </div>

          <div className="bg-white rounded-md p-6 panel-shadow">
            <div className="flex border-b border-line mb-4 -mx-6 px-6">
              {(['oneway','return'] as const).map(tt => (
                <button key={tt} onClick={() => setTripType(tt)}
                  className={`flex-1 pb-3 text-[11px] tracking-[0.1em] uppercase transition-colors border-b-2 -mb-px ${
                    tripType === tt ? 'text-ink border-accent font-medium' : 'text-muted border-transparent hover:text-sub'
                  }`}>
                  {tt === 'oneway' ? t.oneway : t.return}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-muted">{t.pickup}</label>
                <select value={form.pickup} onChange={e => setForm(p => ({ ...p, pickup: e.target.value }))}>
                  <option value="">—</option>
                  {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  {destinations.map(l => <option key={l.id} value={l.id}>{lang === 'tr' ? (l.name_tr || l.name) : l.name}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-muted">{t.dropoff}</label>
                <select value={form.dropoff} onChange={e => setForm(p => ({ ...p, dropoff: e.target.value }))}>
                  <option value="">—</option>
                  {destinations.map(l => <option key={l.id} value={l.id}>{lang === 'tr' ? (l.name_tr || l.name) : l.name}</option>)}
                  {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-muted">{t.date}</label>
                <div className="flex gap-1">
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="flex-1" />
                  <input type="time" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))} className="w-20" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9px] tracking-[0.12em] uppercase text-muted">{t.passengers}</label>
                <select value={form.passengers} onChange={e => setForm(p => ({ ...p, passengers: e.target.value }))}>
                  {Array.from({ length: 14 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {tripType === 'return' && (
              <div className="grid grid-cols-2 gap-2.5 mb-3 pt-3 border-t border-line">
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-muted">{t.returnDate}</label>
                  <div className="flex gap-1">
                    <input type="date" value={form.returnDate} onChange={e => setForm(p => ({ ...p, returnDate: e.target.value }))} className="flex-1" />
                    <input type="time" value={form.returnTime} onChange={e => setForm(p => ({ ...p, returnTime: e.target.value }))} className="w-20" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[9px] tracking-[0.12em] uppercase text-muted">{t.returnFrom}</label>
                  <select value={form.returnPickup} onChange={e => setForm(p => ({ ...p, returnPickup: e.target.value }))}>
                    <option value="">—</option>
                    {destinations.map(l => <option key={l.id} value={l.id}>{lang === 'tr' ? (l.name_tr || l.name) : l.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button onClick={handleSearch} disabled={!canSearch}
              className="w-full bg-accent hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed text-ink font-medium text-[12px] tracking-[0.08em] uppercase py-3 rounded transition-colors mt-2">
              {t.search} →
            </button>
          </div>
        </div>
      </div>

      <div className="bg-cream border-y border-line">
        <div className="max-w-7xl mx-auto px-8 md:px-12 py-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { num: '4.8 ★', label: t.rating },
            { num: '2,400+', label: t.transfers },
            { num: '24/7', label: t.support },
            { num: lang === 'en' ? 'Fixed' : 'Sabit', label: t.pricing },
          ].map(s => (
            <div key={s.label} className="text-center">
              <div className="text-[20px] font-medium text-ink">{s.num}</div>
              <div className="text-[10px] tracking-[0.12em] uppercase text-muted mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 md:px-12 py-16 md:py-24">
        <p className="text-[11px] tracking-[0.25em] text-accent-2 uppercase mb-3 text-center">{t.why}</p>
        <div className="grid md:grid-cols-3 gap-10 mt-10">
          {[
            { t: t.w1t, d: t.w1d },
            { t: t.w2t, d: t.w2d },
            { t: t.w3t, d: t.w3d },
          ].map(w => (
            <div key={w.t}>
              <div className="w-10 h-[2px] bg-accent mb-4" />
              <h3 className="text-[18px] font-medium text-ink mb-2">{w.t}</h3>
              <p className="text-[13px] text-sub leading-relaxed">{w.d}</p>
            </div>
          ))}
        </div>
      </div>

      <footer className="bg-ink text-white/60 py-10 px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-between gap-6 text-[12px]">
          <div>
            <div className="tracking-[0.22em] text-white font-medium mb-2">DALAMANAIR</div>
            <div className="text-white/50">Private airport transfers · Marmaris region</div>
          </div>
          <div className="flex gap-8">
            <a href="/help" className="hover:text-white">Help</a>
            <a href="/how-it-works" className="hover:text-white">How it works</a>
            <a href="/provider" className="hover:text-white">For providers</a>
          </div>
          <div className="text-white/40">© 2026 · dalaman.me</div>
        </div>
      </footer>
    </div>
  )
}
