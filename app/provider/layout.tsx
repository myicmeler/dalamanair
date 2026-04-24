'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient() as any
  const [providerName, setProviderName] = useState('Provider')
  const [menuOpen, setMenuOpen] = useState(false)
  const [quoteBadge, setQuoteBadge] = useState(0)
  const [providerId, setProviderId] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin?redirect=/provider'); return }
      const { data: provider } = await supabase
        .from('providers')
        .select('id, company_name')
        .eq('user_id', user.id)
        .single()
      if (!provider) return
      setProviderName(provider.company_name)
      setProviderId(provider.id)
      await loadBadge(provider.id)
    }
    load()
  }, [])

  async function loadBadge(pId: string) {
    // Count open quote requests this provider hasn't submitted an offer on yet
    const { data: openRequests } = await supabase
      .from('quote_requests')
      .select('id')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())

    if (!openRequests || openRequests.length === 0) { setQuoteBadge(0); return }

    const { data: myOffers } = await supabase
      .from('quote_offers')
      .select('request_id')
      .eq('provider_id', pId)
      .in('request_id', openRequests.map((r: any) => r.id))

    const offeredIds = new Set((myOffers ?? []).map((o: any) => o.request_id))
    const unanswered = openRequests.filter((r: any) => !offeredIds.has(r.id)).length
    setQuoteBadge(unanswered)
  }

  // Refresh badge every 2 minutes
  useEffect(() => {
    if (!providerId) return
    const interval = setInterval(() => loadBadge(providerId), 120000)
    return () => clearInterval(interval)
  }, [providerId])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { href:'/provider', label:'Dashboard' },
    { href:'/provider/bookings', label:'Bookings' },
    { href:'/provider/drivers', label:'Drivers' },
    { href:'/provider/vehicles', label:'Fleet' },
    { href:'/provider/reviews', label:'Reviews' },
    { href:'/provider/quotes', label:'Quotes', badge: quoteBadge },
  ]

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', color:'#f0ede6'}}>
      {/* Top bar */}
      <div style={{backgroundColor:'#1a1f26', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'52px', position:'sticky', top:0, zIndex:40}}>
        <div style={{fontSize:'13px', fontWeight:'500'}}>{providerName}</div>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          {quoteBadge > 0 && (
            <Link href="/provider/quotes" style={{textDecoration:'none'}}>
              <div style={{display:'flex', alignItems:'center', gap:'6px', backgroundColor:'rgba(244,185,66,0.15)', border:'1px solid rgba(244,185,66,0.3)', borderRadius:'20px', padding:'4px 10px'}}>
                <span style={{fontSize:'11px', color:'#f4b942', fontWeight:'500'}}>
                  {quoteBadge} new quote{quoteBadge > 1 ? 's' : ''}
                </span>
              </div>
            </Link>
          )}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{background:'none', border:'none', cursor:'pointer', padding:'8px', display:'flex', flexDirection:'column', gap:'5px'}}>
            {[0,1,2].map(i => (
              <div key={i} style={{width:'20px', height:'1.5px', backgroundColor:'#f0ede6', opacity:menuOpen&&i===1?0:1, transition:'all 0.2s',
                transform:menuOpen?(i===0?'rotate(45deg) translate(4px,4px)':i===2?'rotate(-45deg) translate(4px,-4px)':'none'):'none'}} />
            ))}
          </button>
        </div>
      </div>

      {/* Full screen menu */}
      {menuOpen && (
        <div style={{position:'fixed', top:'52px', left:0, right:0, bottom:0, backgroundColor:'#1a1f26', zIndex:30, padding:'8px 0', overflowY:'auto'}}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'16px 20px', fontSize:'16px',
              color:pathname===item.href?'#f4b942':'rgba(255,255,255,0.8)',
              borderBottom:'1px solid rgba(255,255,255,0.06)', textDecoration:'none',
              fontWeight:pathname===item.href?'500':'400',
            }}>
              {item.label}
              {item.badge && item.badge > 0 ? (
                <span style={{backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'10px', padding:'2px 8px', fontSize:'11px', fontWeight:'600'}}>
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
          <button onClick={handleSignOut} style={{display:'block', width:'100%', padding:'16px 20px', fontSize:'16px', color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', textAlign:'left', marginTop:'8px'}}>
            Sign out
          </button>
        </div>
      )}

      {/* Bottom tab bar */}
      <div style={{position:'fixed', bottom:0, left:0, right:0, backgroundColor:'#1a1f26', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', zIndex:20, paddingBottom:'env(safe-area-inset-bottom)'}}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{
            flex:1, padding:'10px 0', textAlign:'center', textDecoration:'none',
            fontSize:'10px', letterSpacing:'0.05em', position:'relative',
            color:pathname===item.href?'#f4b942':'rgba(255,255,255,0.4)',
            fontWeight:pathname===item.href?'500':'400',
          }}>
            {item.label}
            {item.badge && item.badge > 0 ? (
              <span style={{
                position:'absolute', top:'4px', right:'calc(50% - 18px)',
                backgroundColor:'#f4b942', color:'#0f1419',
                borderRadius:'50%', width:'16px', height:'16px',
                fontSize:'9px', fontWeight:'700',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>{item.badge > 9 ? '9+' : item.badge}</span>
            ) : null}
          </Link>
        ))}
      </div>

      <div style={{paddingBottom:'60px'}}>{children}</div>
    </div>
  )
}
