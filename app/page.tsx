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
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>

      {/* HERO */}
      <div style={{backgroundColor:'#0f1419', position:'relative'}}>
        <Nav lang={lang} onLangChange={setLang} variant="overlay" />
        <div style={{
          maxWidth:'1280px', margin:'0 auto',
          padding:'56px 48px 72px',
          display:'grid', gridTemplateColumns:'1fr 420px',
          gap:'40px', alignItems:'center',
          minHeight:'520px'
        }}>
          {/* Hero text */}
          <div>
            <p style={{fontSize:'11px', letterSpacing:'0.25em', color:'#f4b942', textTransform:'uppercase', marginBottom:'20px'}}>
              {t.tag}
            </p>
            <h1 style={{fontSize:'64px', lineHeight:'1.05', fontWeight:'400', color:'#ffffff', marginBottom:'20px'}}>
              {t.h1a}<br/>
              <em style={{fontStyle:'normal', color:'#f4b942', fontWeight:'500'}}>{t.h1b}</em>
            </h1>
            <p style={{fontSize:'14px', color:'rgba(255,255,255,0.7)', maxWidth:'420px', lineHeight:'1.6'}}>
              {t.sub}
            </p>
          </div>

          {/* Search panel */}
          <div style={{backgroundColor:'#ffffff', borderRadius:'6px', padding:'24px', boxShadow:'0 8px 28px rgba(0,0,0,0.2)'}}>
            {/* Tabs */}
            <div style={{display:'flex', borderBottom:'1px solid #e5e3dd', marginBottom:'16px', marginLeft:'-24px', marginRight:'-24px', paddingLeft:'24px', paddingRight:'24px'}}>
              {(['oneway','return'] as const).map(tt => (
                <button key={tt} onClick={() => setTripType(tt)} style={{
                  flex:1, paddingBottom:'12px', fontSize:'11px',
                  letterSpacing:'0.1em', textTransform:'uppercase',
                  borderBottom: tripType === tt ? '2px solid #f4b942' : '2px solid transparent',
                  color: tripType === tt ? '#0f1419' : '#8a8680',
                  fontWeight: tripType === tt ? '500' : '400',
                  marginBottom:'-1px', background:'none', cursor:'pointer'
                }}>
                  {tt === 'oneway' ? t.oneway : t.return}
                </button>
              ))}
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
              <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680'}}>{t.pickup}</label>
                <select value={form.pickup} onChange={e => setForm(p => ({...p, pickup:e.target.value}))}>
                  <option value="">—</option>
                  {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                </select>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680'}}>{t.dropoff}</label>
                <select value={form.dropoff} onChange={e => setForm(p => ({...p, dropoff:e.target.value}))}>
                  <option value="">—</option>
                  {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                  {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
              <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680'}}>{t.date}</label>
                <div style={{display:'flex', gap:'4px'}}>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date:e.target.value}))} style={{flex:1}} />
                  <input type="time" value={form.time} onChange={e => setForm(p => ({...p, time:e.target.value}))} style={{width:'76px'}} />
                </div>
              </div>
              <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680'}}>{t.passengers}</label>
                <select value={form.passengers} onChange={e => setForm(p => ({...p, passengers:e.target.value}))}>
                  {Array.from({length:14},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>

            {tripType === 'return' && (
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'12px', paddingTop:'12px', borderTop:'1px solid #e5e3dd'}}>
                <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680'}}>{t.returnDate}</label>
                  <div style={{display:'flex', gap:'4px'}}>
                    <input type="date" value={form.returnDate} onChange={e => setForm(p => ({...p, returnDate:e.target.value}))} style={{flex:1}} />
                    <input type="time" value={form.returnTime} onChange={e => setForm(p => ({...p, returnTime:e.target.value}))} style={{width:'76px'}} />
                  </div>
                </div>
                <div style={{display:'flex', flexDirection:'column', gap:'4px'}}>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680'}}>{t.returnFrom}</label>
                  <select value={form.returnPickup} onChange={e => setForm(p => ({...p, returnPickup:e.target.value}))}>
                    <option value="">—</option>
                    {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                  </select>
                </div>
              </div>
            )}

            <button onClick={handleSearch} disabled={!canSearch} style={{
              width:'100%', backgroundColor: canSearch ? '#f4b942' : '#fad98a',
              color:'#0f1419', fontWeight:'500', fontSize:'12px',
              letterSpacing:'0.08em', textTransform:'uppercase',
              padding:'12px', borderRadius:'3px', border:'none',
              cursor: canSearch ? 'pointer' : 'not-allowed', marginTop:'8px'
            }}>
              {t.search} →
            </button>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div style={{backgroundColor:'#f5f2ea', borderTop:'1px solid #e5e3dd', borderBottom:'1px solid #e5e3dd'}}>
        <div style={{maxWidth:'1280px', margin:'0 auto', padding:'24px 48px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px'}}>
          {[
            {num:'4.8 ★', label:t.rating},
            {num:'2,400+', label:t.transfers},
            {num:'24/7', label:t.support},
            {num: lang==='en'?'Fixed':'Sabit', label:t.pricing},
          ].map(s => (
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontSize:'20px', fontWeight:'500', color:'#0f1419'}}>{s.num}</div>
              <div style={{fontSize:'10px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WHY SECTION */}
      <div style={{maxWidth:'1152px', margin:'0 auto', padding:'80px 48px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.25em', color:'#e0a528', textTransform:'uppercase', marginBottom:'12px', textAlign:'center'}}>{t.why}</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'40px', marginTop:'40px'}}>
          {[
            {title:t.w1t, desc:t.w1d},
            {title:t.w2t, desc:t.w2d},
            {title:t.w3t, desc:t.w3d},
          ].map(w => (
            <div key={w.title}>
              <div style={{width:'40px', height:'2px', backgroundColor:'#f4b942', marginBottom:'16px'}} />
              <h3 style={{fontSize:'18px', fontWeight:'500', color:'#0f1419', marginBottom:'8px'}}>{w.title}</h3>
              <p style={{fontSize:'13px', color:'#5a574f', lineHeight:'1.6'}}>{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer style={{backgroundColor:'#0f1419', padding:'40px 48px'}}>
        <div style={{maxWidth:'1280px', margin:'0 auto', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'24px', fontSize:'12px', color:'rgba(255,255,255,0.5)'}}>
          <div>
            <div style={{letterSpacing:'0.22em', color:'#ffffff', fontWeight:'500', marginBottom:'8px'}}>DALAMANAIR</div>
            <div>Private airport transfers · Marmaris region</div>
          </div>
          <div style={{display:'flex', gap:'32px'}}>
            <a href="/help" style={{color:'rgba(255,255,255,0.5)'}}>Help</a>
            <a href="/how-it-works" style={{color:'rgba(255,255,255,0.5)'}}>How it works</a>
            <a href="/provider" style={{color:'rgba(255,255,255,0.5)'}}>For providers</a>
          </div>
          <div>© 2026 · dalaman.me</div>
        </div>
      </footer>
    </div>
  )
}
