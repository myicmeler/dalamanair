'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

const labels = {
  en: {
    tag: 'Içmeler · Marmaris · Dalaman',
    h1a: 'The smarter way to get from',
    h1b: 'Dalaman airport to Marmaris and Içmeler.',
    sub: 'Compare trusted local transfer companies, book in minutes, and arrive at your hotel without the stress. Fixed prices. English-speaking drivers. No surprises.',
    oneway: 'One way', return: 'Return',
    pickup: 'Pick-up', dropoff: 'Drop-off',
    date: 'Date', time: 'Time', passengers: 'Passengers',
    returnDate: 'Return date', returnTime: 'Return time', returnFrom: 'Return pick-up',
    search: 'Search transfers',
    rating: 'Average rating', transfers: 'Transfers completed',
    support: 'English support', pricing: 'No surge pricing',
    why: 'Why book with us',
    w1t: 'Book before you fly',
    w1d: 'Arrange your transfer from home. When you land, everything is already sorted — no queues, no touts, no hassle.',
    w2t: 'Fixed prices',
    w2d: 'The price you see is what you pay. No hidden fees, no meter running, no negotiating at the airport.',
    w3t: 'Vetted local providers',
    w3d: 'Every transfer company on dalaman.me is reviewed and approved by us. Only trusted, insured operators make the list.',
    disclaimer: 'dalaman.me is an independent booking platform connecting travellers with local transfer providers. Transfers are operated by approved third-party companies.',
  },
  tr: {
    tag: 'İçmeler · Marmaris · Dalaman',
    h1a: 'Dalaman havalimanından',
    h1b: 'Marmaris ve İçmeler\'e akıllı transfer.',
    sub: 'Güvenilir yerel transfer şirketlerini karşılaştırın, dakikalar içinde rezervasyon yapın ve stressiz otelinize ulaşın. Sabit fiyat. İngilizce konuşan sürücüler.',
    oneway: 'Tek yön', return: 'Gidiş-dönüş',
    pickup: 'Alış', dropoff: 'Varış',
    date: 'Tarih', time: 'Saat', passengers: 'Yolcular',
    returnDate: 'Dönüş tarihi', returnTime: 'Dönüş saati', returnFrom: 'Dönüş alış',
    search: 'Transfer ara',
    rating: 'Ortalama puan', transfers: 'Tamamlanan transfer',
    support: 'İngilizce destek', pricing: 'Sürpriz fiyat yok',
    why: 'Neden biz',
    w1t: 'Uçmadan önce rezervasyon',
    w1d: 'Transferinizi evden ayarlayın. İndiğinizde her şey hazır — kuyruk yok, sorun yok.',
    w2t: 'Sabit fiyatlar',
    w2d: 'Gördüğünüz fiyat ödediğiniz fiyattır. Gizli ücret yok, havalimanında pazarlık yok.',
    w3t: 'Onaylı yerel sağlayıcılar',
    w3d: 'dalaman.me\'deki her transfer şirketi tarafımızdan incelenir ve onaylanır. Yalnızca güvenilir, sigortalı operatörler listede yer alır.',
    disclaimer: 'dalaman.me, yolcuları yerel transfer sağlayıcılarıyla buluşturan bağımsız bir rezervasyon platformudur. Transferler onaylı üçüncü taraf şirketler tarafından gerçekleştirilir.',
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
    router.push(`/search/?${params.toString()}`)
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      {/* HERO */}
      <div style={{backgroundColor:'#0f1419'}}>
        <Nav lang={lang} onLangChange={setLang} variant="overlay" />
        <div style={{padding:'32px 20px 48px', maxWidth:'1280px', margin:'0 auto'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'14px'}}>{t.tag}</p>
          <h1 style={{fontSize:'clamp(28px, 6vw, 58px)', lineHeight:'1.1', fontWeight:'400', color:'#ffffff', marginBottom:'14px', maxWidth:'780px'}}>
            {t.h1a}<br/>
            <em style={{fontStyle:'normal', color:'#f4b942', fontWeight:'500'}}>{t.h1b}</em>
          </h1>
          <p style={{fontSize:'15px', color:'rgba(255,255,255,0.65)', lineHeight:'1.7', marginBottom:'36px', maxWidth:'520px'}}>{t.sub}</p>

          {/* Search panel */}
          <div style={{backgroundColor:'#ffffff', borderRadius:'8px', padding:'20px', boxShadow:'0 8px 32px rgba(0,0,0,0.25)', maxWidth:'560px'}}>
            {/* Trip type tabs */}
            <div style={{display:'flex', borderBottom:'1px solid #e5e3dd', marginBottom:'16px', marginLeft:'-20px', marginRight:'-20px', paddingLeft:'20px', paddingRight:'20px'}}>
              {(['oneway','return'] as const).map(tt => (
                <button key={tt} onClick={() => setTripType(tt)} style={{
                  flex:1, paddingBottom:'12px', fontSize:'12px', letterSpacing:'0.08em',
                  textTransform:'uppercase', border:'none', background:'none', cursor:'pointer',
                  borderBottom: tripType===tt ? '2px solid #f4b942' : '2px solid transparent',
                  color: tripType===tt ? '#0f1419' : '#8a8680',
                  fontWeight: tripType===tt ? '600' : '400', marginBottom:'-1px',
                }}>
                  {tt === 'oneway' ? t.oneway : t.return}
                </button>
              ))}
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.pickup}</label>
                  <select value={form.pickup} onChange={e => setForm(p=>({...p,pickup:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}}>
                    <option value="">—</option>
                    {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.dropoff}</label>
                  <select value={form.dropoff} onChange={e => setForm(p=>({...p,dropoff:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}}>
                    <option value="">—</option>
                    {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                    {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.date}</label>
                  <input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}} />
                </div>
                <div>
                  <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.time}</label>
                  <input type="time" value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}} />
                </div>
              </div>

              <div>
                <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.passengers}</label>
                <select value={form.passengers} onChange={e => setForm(p=>({...p,passengers:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}}>
                  {Array.from({length:14},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {tripType === 'return' && (
                <div style={{borderTop:'1px solid #e5e3dd', paddingTop:'12px', display:'flex', flexDirection:'column', gap:'12px'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.returnDate}</label>
                      <input type="date" value={form.returnDate} onChange={e => setForm(p=>({...p,returnDate:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}} />
                    </div>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.returnTime}</label>
                      <input type="time" value={form.returnTime} onChange={e => setForm(p=>({...p,returnTime:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}} />
                    </div>
                  </div>
                  <div>
                    <label style={{fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', display:'block', marginBottom:'4px'}}>{t.returnFrom}</label>
                    <select value={form.returnPickup} onChange={e => setForm(p=>({...p,returnPickup:e.target.value}))} style={{width:'100%', fontSize:'14px', padding:'11px 10px'}}>
                      <option value="">—</option>
                      {destinations.map(l => <option key={l.id} value={l.id}>{lang==='tr'?(l.name_tr||l.name):l.name}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <button onClick={handleSearch} disabled={!canSearch} style={{
                width:'100%', backgroundColor: canSearch?'#f4b942':'#fad98a',
                color:'#0f1419', fontWeight:'600', fontSize:'13px', letterSpacing:'0.06em',
                textTransform:'uppercase', padding:'14px', borderRadius:'4px',
                border:'none', cursor: canSearch?'pointer':'not-allowed',
              }}>
                {t.search} →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TRUST BAR */}
      <div style={{backgroundColor:'#f5f2ea', borderTop:'1px solid #e5e3dd', borderBottom:'1px solid #e5e3dd'}}>
        <div style={{maxWidth:'1280px', margin:'0 auto', padding:'20px', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:'16px'}}>
          {[
            {num:'4.8 ★', label:t.rating},
            {num:'2,400+', label:t.transfers},
            {num:'24/7', label:t.support},
            {num:lang==='en'?'Fixed':'Sabit', label:t.pricing},
          ].map(s => (
            <div key={s.label} style={{textAlign:'center'}}>
              <div style={{fontSize:'20px', fontWeight:'500', color:'#0f1419'}}>{s.num}</div>
              <div style={{fontSize:'10px', letterSpacing:'0.12em', textTransform:'uppercase', color:'#8a8680', marginTop:'4px'}}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* WHY BOOK WITH US */}
      <div style={{maxWidth:'1100px', margin:'0 auto', padding:'56px 20px 48px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', textAlign:'center', marginBottom:'10px'}}>{t.why}</p>
        <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'32px', marginTop:'32px'}}>
          {[
            {title:t.w1t, desc:t.w1d},
            {title:t.w2t, desc:t.w2d},
            {title:t.w3t, desc:t.w3d},
          ].map(w => (
            <div key={w.title}>
              <div style={{width:'36px', height:'2px', backgroundColor:'#f4b942', marginBottom:'14px'}} />
              <h3 style={{fontSize:'17px', fontWeight:'500', color:'#0f1419', marginBottom:'8px'}}>{w.title}</h3>
              <p style={{fontSize:'13px', color:'#5a574f', lineHeight:'1.7', margin:0}}>{w.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* DISCLAIMER */}
      <div style={{borderTop:'1px solid #e5e3dd', padding:'16px 20px', backgroundColor:'#faf8f3'}}>
        <p style={{maxWidth:'1100px', margin:'0 auto', fontSize:'11px', color:'#8a8680', lineHeight:'1.6', textAlign:'center'}}>
          {t.disclaimer}
        </p>
      </div>

      {/* FOOTER */}
      <footer style={{backgroundColor:'#0f1419', padding:'36px 20px'}}>
        <div style={{maxWidth:'1280px', margin:'0 auto', display:'flex', flexDirection:'column', gap:'16px', fontSize:'12px', color:'rgba(255,255,255,0.5)'}}>
          <div>
            <div style={{fontSize:'13px', letterSpacing:'0.18em', color:'#ffffff', fontWeight:'600', marginBottom:'6px'}}>dalaman.me</div>
            <div>Private airport transfers · Marmaris region</div>
          </div>
          <div style={{display:'flex', gap:'20px', flexWrap:'wrap'}}>
            <a href="/help/" style={{color:'rgba(255,255,255,0.5)', textDecoration:'none'}}>Help</a>
            <a href="/how-it-works/" style={{color:'rgba(255,255,255,0.5)', textDecoration:'none'}}>How it works</a>
            <a href="/quote/" style={{color:'rgba(255,255,255,0.5)', textDecoration:'none'}}>Request a quote</a>
            <a href="/provider/" style={{color:'rgba(255,255,255,0.5)', textDecoration:'none'}}>For providers</a>
          </div>
          <div style={{fontSize:'11px', color:'rgba(255,255,255,0.25)'}}>
            © 2026 · dalaman.me · An independent transfer booking platform
          </div>
        </div>
      </footer>
    </div>
  )
}
