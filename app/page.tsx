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
    date: 'Date', time: 'Time', passengers: 'Passengers',
    returnDate: 'Return date', returnTime: 'Return time', returnFrom: 'Return pick-up',
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
    sub: 'Özel araçlar, İngilizce konuşan sürücüler, sabit fiyat.',
    oneway: 'Tek yön', return: 'Gidiş-dönüş',
    pickup: 'Alış', dropoff: 'Varış',
    date: 'Tarih', time: 'Saat', passengers: 'Yolcular',
    returnDate: 'Dönüş tarihi', returnTime: 'Dönüş saati', returnFrom: 'Dönüş alış',
    search: 'Transfer ara',
    rating: 'Ortalama puan', transfers: 'Tamamlanan transfer',
    support: 'İngilizce destek', pricing: 'Sürpriz fiyat yok',
    why: 'Neden biz',
    w1t: 'Sabit fiyatlar', w1d: 'Gördüğünüz fiyat ödediğiniz fiyattır.',
    w2t: 'Karşılama', w2d: 'Sürücünüz varışta sizi karşılar.',
    w3t: '7/24 destek', w3d: 'Her zaman ulaşabilirsiniz.',
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
    pickup:'', dropoff:'', date:'', time:'14:00',
    passengers:'2', returnDate:'', returnTime:'10:00', returnPickup:'',
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
      tripType, pickup:form.pickup, dropoff:form.dropoff,
      date:form.date, time:form.time, passengers:form.passengers,
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
      <div style={{backgroundColor:'#0f1419'}}>
        <Nav lang={lang} onLangChange={setLang} variant="overlay" />

        <div style={{padding:'32px 20px 40px', maxWidth:'1280px', margin:'0 auto'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'14px'}}>{t.tag}</p>
          <h1 style={{fontSize:'clamp(32px, 8vw, 64px)', lineHeight:'1.05', fontWeight:'400', color:'#ffffff', marginBottom:'14px'}}>
            {t.h1a}<br/>
            <em style={{fontStyle:'normal', color:'#f4b942', fontWeight:'500'}}>{t.h1b}</em>
          </h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.7)', lineHeight:'1.6', marginBottom:'32px', maxWidth:'480px'}}>{t.sub}</p>

          <div style={{backgroundColor:'#ffffff', borderRadius:'8px', padding:'20px', boxShadow:'0 8px 28px rgba(0,0,0,0.25)', maxWidth:'520px'}}>
            <div style={{display:'flex', borderBottom:'1px solid #e5e3dd', marginBottom:'16px', marginLeft:'-20px', marginRight:'-20px', paddingLeft:'20px', paddingRight:'20px'}}>
              {(['oneway','return'] as const).map(tt => (
                <button key={tt} onClick={() => setTripType(tt)} style={{
                  flex:1, paddingBottom:'12px', fontSize:'12px', letterSpacing:'0.08em',
                  textTransform:'uppercase', border:'none', background:'none', cursor:'pointer',
                  borderBottom: tripType===tt ? '2px solid #f4b942' : '2px solid transparent',
                  color: tripType===tt ? '#0f1419' : '#8a8680',
                  fontWeight: tripType===tt ? '600' : '400', marginBottom:'-1px'
                }}>
                  {tt==='oneway' ? t.oneway : t.return}
                </button>
              ))}
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.pickup}</label>
                  <select value={form.pickup} onChange={e => setForm(p => ({...p, pickup:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}}>
                    <option value="">—</option>
                    {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.dropoff}</label>
                  <select value={form.dropoff} onChange={e => setForm(p => ({...p, dropoff:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}}>
                    <option value="">—</option>
                    {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                    {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.date}</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({...p, date:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}} />
                </div>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.time}</label>
                  <input type="time" value={form.time} onChange={e => setForm(p => ({...p, time:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}} />
                </div>
              </div>

              <div>
                <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.passengers}</label>
                <select value={form.passengers} onChange={e => setForm(p => ({...p, passengers:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}}>
                  {Array.from({length:14},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {tripType === 'return' && (
                <div style={{borderTop:'1px solid #e5e3dd', paddingTop:'12px', display:'flex', flexDirection:'column', gap:'12px'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.returnDate}</label>
                      <input type="date" value={form.returnDate} onChange={e => setForm(p => ({...p, returnDate:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}} />
                    </div>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.returnTime}</label>
                      <input type="time" value={form.returnTime} onChange={e => setForm(p => ({...p, returnTime:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}} />
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.returnFrom}</label>
                    <select value={form.returnPickup} onChange={e => setForm(p => ({...p, returnPickup:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'12px 10px'}}>
                      <option value="">—</option>
                      {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <button onClick={handleSearch} disabled={!canSearch} style={{
                width:'100%', backgroundColor: canSearch ? '#f4b942' : '#fad98a',
                color:'#0f1419', fontWeight:'600', fontSize:'13px', letterSpacing:'0.08em',
                textTransform:'uppercase', padding:'15px', borderRadius:'4px',
                border:'none', cursor: canSearch ? 'pointer' : 'not-allowed'
              }}>
                {t.search} →
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{backgroundColor:'#f5f2ea', borderTop:'1px solid #e5e3dd', borderBottom:'1px solid #e5e3dd'}}>
        <div style={{maxWidth:'1280px', margin:'0 auto', padding:'20px', display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:'16px'}}>
          {[
            {num:'4.8 ★', label:t.rating},
            {num:'2,400+', label:t.transfers},
            {num:'24/7', label:t.support},
            {num:lang==='en'?'Fixed':'Sabit', label:t.pricing},
          ].map(s => (
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontSize:'18px', fontWeight:'500', color:'#0f1419'}}>{s.num}</div>
              <div style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#8a8680', marginTop:'3px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{maxWidth:'1152px', margin:'0 auto', padding:'48px 20px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', textAlign:'center', marginBottom:'8px'}}>{t.why}</p>
        <div style={{display:'grid', gridTemplateColumns:'1fr', gap:'28px', marginTop:'28px'}}>
          {[
            {title:t.w1t, desc:t.w1d},
            {title:t.w2t, desc:t.w2d},
            {title:t.w3t, desc:t.w3d},
          ].map(w => (
            <div key={w.title}>
              <div style={{width:'36px', height:'2px', backgroundColor:'#f4b942', marginBottom:'10px'}} />
              <h3 style={{fontSize:'16px', fontWeight:'500', color:'#0f1419', marginBottom:'6px'}}>{w.title}</h3>
              <p style={{fontSize:'13px', color:'#5a574f', lineHeight:'1.6'}}>{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <footer style={{backgroundColor:'#0f1419', padding:'32px 20px'}}>
        <div style={{maxWidth:'1280px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px', fontSize:'12px', color:'rgba(255,255,255,0.5)'}}>
          <div>
            <div style={{letterSpacing:'0.22em', color:'#ffffff', fontWeight:'500', marginBottom:'6px'}}>DALAMANAIR</div>
            <div>Private airport transfers · Marmaris region</div>
          </div>
          <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
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
