'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
import { createClient } from '@/lib/supabase'

const labels = {
  en: {
    tag:'Içmeler · Marmaris · Dalaman',
    h1a:'The smarter way to get from',
    h1b:'Dalaman airport to Marmaris and Içmeler.',
    sub:'Compare trusted local transfer companies, book in minutes, and arrive at your hotel without the stress.',
    oneway:'One way', return:'Return',
    pickup:'Pick-up', dropoff:'Drop-off',
    date:'Date', time:'Time', passengers:'Passengers',
    returnDate:'Return date', returnTime:'Return time', returnFrom:'Return pick-up',
    search:'Search transfers',
    why:'Why book with us',
    w1t:'Book before you fly', w1d:'Arrange your transfer from home. When you land, everything is already sorted — no queues, no touts, no hassle.',
    w2t:'Fixed prices', w2d:'The price you see is what you pay. No hidden fees, no meter running, no negotiating at the airport.',
    w3t:'Vetted local providers', w3d:'Every transfer company on dalaman.me is reviewed and approved by us. Only trusted, insured operators make the list.',
    disclaimer:'dalaman.me is an independent booking platform connecting travellers with local transfer providers. Transfers are operated by approved third-party companies.',
  },
  tr: {
    tag:'İçmeler · Marmaris · Dalaman',
    h1a:'Dalaman havalimanından',
    h1b:'Marmaris ve İçmeler\'e akıllı transfer.',
    sub:'Güvenilir yerel transfer şirketlerini karşılaştırın, dakikalar içinde rezervasyon yapın ve stressiz otelinize ulaşın.',
    oneway:'Tek yön', return:'Gidiş-dönüş',
    pickup:'Alış', dropoff:'Varış',
    date:'Tarih', time:'Saat', passengers:'Yolcular',
    returnDate:'Dönüş tarihi', returnTime:'Dönüş saati', returnFrom:'Dönüş alış',
    search:'Transfer ara',
    why:'Neden biz',
    w1t:'Uçmadan önce rezervasyon', w1d:'Transferinizi evden ayarlayın. İndiğinizde her şey hazır.',
    w2t:'Sabit fiyatlar', w2d:'Gördüğünüz fiyat ödediğiniz fiyattır. Gizli ücret yok.',
    w3t:'Onaylı yerel sağlayıcılar', w3d:'Tüm sağlayıcılar incelenir ve onaylanır.',
    disclaimer:'dalaman.me, yolcuları yerel transfer sağlayıcılarıyla buluşturan bağımsız bir rezervasyon platformudur.',
  }
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const t = labels[lang]
  const [locations, setLocations] = useState<any[]>([])
  const [tripType, setTripType] = useState<'oneway'|'return'>('oneway')
  const [form, setForm] = useState({ pickup:'', dropoff:'', date:'', time:'14:00', passengers:'2', returnDate:'', returnTime:'10:00', returnPickup:'' })

  useEffect(() => {
    supabase.from('locations').select('*').eq('is_active', true).order('sort_order').order('name')
      .then(({ data }: any) => { if (data) setLocations(data) })
  }, [])

  const airports     = locations.filter(l => l.type === 'airport')
  const destinations = locations.filter(l => l.type !== 'airport')
  const canSearch    = form.pickup && form.dropoff && form.date && form.time
    && (tripType === 'oneway' || (form.returnDate && form.returnTime && form.returnPickup))

  function handleSearch() {
    const p = new URLSearchParams({ tripType, pickup:form.pickup, dropoff:form.dropoff, date:form.date, time:form.time, passengers:form.passengers })
    if (tripType === 'return') { p.set('returnDate', form.returnDate); p.set('returnTime', form.returnTime); p.set('returnPickup', form.returnPickup) }
    router.push(`/search/?${p.toString()}`)
  }

  const inp = { width:'100%', fontSize:'14px', padding:'11px 10px', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#ffffff', outline:'none', boxSizing:'border-box' as const, colorScheme:'dark' as any }
  const lbl = { fontSize:'9px', letterSpacing:'0.12em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px' }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419'}}>
      <Nav lang={lang} onLangChange={setLang} />

      {/* HERO */}
      <div style={{padding:'48px 20px 56px', maxWidth:'1280px', margin:'0 auto'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', marginBottom:'14px'}}>{t.tag}</p>
        <h1 style={{fontSize:'clamp(28px, 6vw, 58px)', lineHeight:'1.1', fontWeight:'400', color:'#ffffff', marginBottom:'14px', maxWidth:'780px'}}>
          {t.h1a}<br/><span style={{color:'#f4b942', fontWeight:'500'}}>{t.h1b}</span>
        </h1>
        <p style={{fontSize:'15px', color:'rgba(255,255,255,0.6)', lineHeight:'1.7', marginBottom:'36px', maxWidth:'520px'}}>{t.sub}</p>

        {/* Search panel */}
        <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'20px', maxWidth:'560px'}}>
          <div style={{display:'flex', borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:'16px', marginLeft:'-20px', marginRight:'-20px', paddingLeft:'20px', paddingRight:'20px'}}>
            {(['oneway','return'] as const).map(tt => (
              <button key={tt} onClick={() => setTripType(tt)} style={{
                flex:1, paddingBottom:'12px', fontSize:'12px', letterSpacing:'0.08em', textTransform:'uppercase',
                border:'none', background:'none', cursor:'pointer',
                borderBottom: tripType===tt ? '2px solid #f4b942' : '2px solid transparent',
                color: tripType===tt ? '#f4b942' : 'rgba(255,255,255,0.4)',
                fontWeight: tripType===tt ? '600' : '400', marginBottom:'-1px',
              }}>{tt==='oneway'?t.oneway:t.return}</button>
            ))}
          </div>

          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
              <div><label style={lbl}>{t.pickup}</label>
                <select value={form.pickup} onChange={e => setForm(p=>({...p,pickup:e.target.value}))} style={inp}>
                  <option value="">—</option>
                  {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  {destinations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div><label style={lbl}>{t.dropoff}</label>
                <select value={form.dropoff} onChange={e => setForm(p=>({...p,dropoff:e.target.value}))} style={inp}>
                  <option value="">—</option>
                  {destinations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  {airports.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
              <div><label style={lbl}>{t.date}</label><input type="date" value={form.date} onChange={e => setForm(p=>({...p,date:e.target.value}))} style={inp} /></div>
              <div><label style={lbl}>{t.time}</label><input type="time" value={form.time} onChange={e => setForm(p=>({...p,time:e.target.value}))} style={inp} /></div>
            </div>
            <div><label style={lbl}>{t.passengers}</label>
              <select value={form.passengers} onChange={e => setForm(p=>({...p,passengers:e.target.value}))} style={inp}>
                {Array.from({length:14},(_,i)=>i+1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            {tripType === 'return' && (
              <div style={{borderTop:'1px solid rgba(255,255,255,0.08)', paddingTop:'12px', display:'flex', flexDirection:'column', gap:'12px'}}>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                  <div><label style={lbl}>{t.returnDate}</label><input type="date" value={form.returnDate} onChange={e => setForm(p=>({...p,returnDate:e.target.value}))} style={inp} /></div>
                  <div><label style={lbl}>{t.returnTime}</label><input type="time" value={form.returnTime} onChange={e => setForm(p=>({...p,returnTime:e.target.value}))} style={inp} /></div>
                </div>
                <div><label style={lbl}>{t.returnFrom}</label>
                  <select value={form.returnPickup} onChange={e => setForm(p=>({...p,returnPickup:e.target.value}))} style={inp}>
                    <option value="">—</option>
                    {destinations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <button onClick={handleSearch} disabled={!canSearch} style={{
              width:'100%', backgroundColor:canSearch?'#f4b942':'rgba(244,185,66,0.3)',
              color:canSearch?'#0f1419':'rgba(255,255,255,0.3)', fontWeight:'600', fontSize:'13px',
              letterSpacing:'0.06em', textTransform:'uppercase', padding:'14px', borderRadius:'6px',
              border:'none', cursor:canSearch?'pointer':'not-allowed',
            }}>{t.search} →</button>
          </div>
        </div>
      </div>

      {/* WHY */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'56px 20px 48px'}}>
        <div style={{maxWidth:'1100px', margin:'0 auto'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#f4b942', textTransform:'uppercase', textAlign:'center', marginBottom:'32px'}}>{t.why}</p>
          <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'32px'}}>
            {[{title:t.w1t,desc:t.w1d},{title:t.w2t,desc:t.w2d},{title:t.w3t,desc:t.w3d}].map(w => (
              <div key={w.title}>
                <div style={{width:'36px', height:'2px', backgroundColor:'#f4b942', marginBottom:'14px'}} />
                <h3 style={{fontSize:'17px', fontWeight:'500', color:'#ffffff', marginBottom:'8px'}}>{w.title}</h3>
                <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', margin:0}}>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DISCLAIMER */}
      <div style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'16px 20px'}}>
        <p style={{maxWidth:'1100px', margin:'0 auto', fontSize:'11px', color:'rgba(255,255,255,0.25)', lineHeight:'1.6', textAlign:'center'}}>{t.disclaimer}</p>
      </div>

      {/* FOOTER */}
      <footer style={{borderTop:'1px solid rgba(255,255,255,0.06)', padding:'36px 20px'}}>
        <div style={{maxWidth:'1280px', margin:'0 auto'}}>
          <div style={{display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px', paddingBottom:'20px', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            <img src="/logo.jpg" alt="dalaman.me" style={{width:'48px', height:'48px', borderRadius:'50%', objectFit:'cover'}} />
            <div>
              <div style={{fontSize:'14px', fontWeight:'700', color:'#ffffff', letterSpacing:'0.1em', marginBottom:'2px'}}>dalaman.me</div>
              <div style={{fontSize:'12px', color:'rgba(255,255,255,0.35)'}}>Airport transfers · Marmaris region</div>
            </div>
          </div>
          <div style={{display:'flex', gap:'20px', flexWrap:'wrap', marginBottom:'16px'}}>
            {[['Help','/help/'],['How it works','/how-it-works/'],['Request a quote','/quote/'],['For providers','/provider/']].map(([label,href]) => (
              <a key={href} href={href} style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', textDecoration:'none'}}>{label}</a>
            ))}
          </div>
          <div style={{fontSize:'11px', color:'rgba(255,255,255,0.2)'}}>© 2026 · dalaman.me · An independent transfer booking platform</div>
        </div>
      </footer>
    </div>
  )
}
