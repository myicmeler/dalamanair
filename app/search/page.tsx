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
  const [locations, setLocations] = useState<Record<string,any>>({})
  const [selected, setSelected] = useState<string|null>(null)
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
        const map: Record<string,any> = {}
        locs.forEach((l: any) => { map[l.id] = l })
        setLocations(map)
      }
      const { data } = await supabase
        .from('vehicles')
        .select('*, provider:providers(company_name, avg_rating, total_reviews)')
        .eq('is_active', true).gte('seats', passengers).order('seats')
      if (data) setVehicles(data)
      setLoading(false)
    }
    load()
  }, [passengers])

  function getPrice(v: any) {
    const base: Record<string,number> = { sedan:29, minivan:45, minibus:72, luxury:89, suv:55 }
    return base[v.type] ?? 45
  }

  function getSorted() {
    return [...vehicles].sort((a,b) => {
      if (sort==='price') return getPrice(a)-getPrice(b)
      if (sort==='rating') return (b.provider?.avg_rating??0)-(a.provider?.avg_rating??0)
      if (sort==='capacity') return b.seats-a.seats
      return 0
    })
  }

  function handleSelect(vehicleId: string) {
    if (selected === vehicleId) {
      const p = new URLSearchParams(params.toString())
      p.set('vehicleId', vehicleId)
      p.set('price', String(getPrice(vehicles.find((v:any) => v.id===vehicleId)!)))
      router.push(`/booking?${p.toString()}`)
    } else {
      setSelected(vehicleId)
    }
  }

  const pickup = locations[pickupId]
  const dropoff = locations[dropoffId]

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}>
      <Nav lang={lang} onLangChange={setLang} />
      <div style={{maxWidth:'800px', margin:'0 auto', padding:'24px 16px'}}>
        <div style={{marginBottom:'20px'}}>
          <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#e0a528', textTransform:'uppercase', marginBottom:'6px'}}>
            {params.get('date')} · {params.get('time')} · {passengers} pax{tripType==='return'?' · Return':''}
          </p>
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#0f1419'}}>
            {pickup?.name??'...'} → {dropoff?.name??'...'}
          </h1>
          <button onClick={() => router.back()} style={{fontSize:'13px', color:'#8a8680', background:'none', border:'none', cursor:'pointer', padding:'0', marginTop:'4px'}}>
            ← Edit search
          </button>
        </div>

        <div style={{display:'flex', gap:'8px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px'}}>
          {(['price','rating','capacity'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              fontSize:'11px', padding:'8px 16px', borderRadius:'20px', border:'1px solid',
              borderColor: sort===s ? '#0f1419' : '#e5e3dd',
              backgroundColor: sort===s ? '#0f1419' : 'transparent',
              color: sort===s ? '#ffffff' : '#5a574f',
              cursor:'pointer', whiteSpace:'nowrap', textTransform:'capitalize'
            }}>{s}</button>
          ))}
        </div>

        {loading ? (
          <div style={{textAlign:'center', padding:'60px 0', color:'#8a8680'}}>Loading...</div>
        ) : vehicles.length===0 ? (
          <div style={{textAlign:'center', padding:'60px 0', color:'#8a8680'}}>No vehicles for {passengers} passengers</div>
        ) : (
          <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
            {getSorted().map((v:any) => {
              const price = getPrice(v)
              const returnPrice = Math.round(price*0.9)
              const isSelected = selected===v.id
              const rating = v.provider?.avg_rating??0
              return (
                <div key={v.id} onClick={() => handleSelect(v.id)} style={{
                  backgroundColor:'#ffffff', border:`1.5px solid ${isSelected?'#f4b942':'#e5e3dd'}`,
                  borderRadius:'8px', padding:'16px', cursor:'pointer'
                }}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px'}}>
                    <div style={{flex:1}}>
                      <p style={{fontSize:'10px', letterSpacing:'0.15em', color:'#8a8680', textTransform:'uppercase', marginBottom:'3px'}}>{v.type}</p>
                      <p style={{fontSize:'16px', fontWeight:'500', color:'#0f1419', marginBottom:'4px'}}>{v.make} {v.model}</p>
                      <p style={{fontSize:'12px', color:'#8a8680'}}>{v.seats} pax · {v.luggage_capacity} bags</p>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <p style={{fontSize:'22px', fontWeight:'500', color:'#0f1419'}}>€{price}</p>
                      {tripType==='return' && <p style={{fontSize:'11px', color:'#8a8680'}}>+€{returnPrice} return</p>}
                    </div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
                    <div style={{display:'flex', alignItems:'center', gap:'6px'}}>
                      <div style={{display:'flex', gap:'2px'}}>
                        {[1,2,3,4,5].map(i => (
                          <div key={i} style={{width:'10px', height:'10px', backgroundColor: i<=Math.round(rating)?'#f4b942':'#e5e3dd',
                            clipPath:'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)'}} />
                        ))}
                      </div>
                      <span style={{fontSize:'11px', color:'#8a8680'}}>{rating.toFixed(1)}</span>
                    </div>
                    <button style={{
                      fontSize:'12px', fontWeight:'500', padding:'8px 20px', borderRadius:'4px', border:'none',
                      backgroundColor: isSelected?'#f4b942':'#0f1419',
                      color: isSelected?'#0f1419':'#ffffff', cursor:'pointer'
                    }}>{isSelected?'Continue →':'Select'}</button>
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
  return <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}/>}><SearchContent /></Suspense>
}
