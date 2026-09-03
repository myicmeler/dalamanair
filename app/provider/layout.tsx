'use client'
import { useState, useEffect, useRef } from 'react'
import { useProviderLang } from '@/lib/providerText'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient() as any
  const { lang, setLang, t } = useProviderLang()
  const [providerName, setProviderName] = useState('Provider')
  const [menuOpen, setMenuOpen] = useState(false)
  const [quoteBadge, setQuoteBadge] = useState(0)
  const [providerId, setProviderId] = useState('')
  const [userId, setUserId] = useState('')
  const [notifications, setNotifications] = useState<any[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

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
      setUserId(user.id)
      await loadBadge(provider.id)
      await loadNotifications(user.id)
    }
    load()
  }, [])

  async function loadBadge(pId: string) {
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

    const { data: myDeclines } = await supabase
      .from('quote_declines')
      .select('request_id')
      .eq('provider_id', pId)
      .in('request_id', openRequests.map((r: any) => r.id))

    const handledIds = new Set([
      ...(myOffers ?? []).map((o: any) => o.request_id),
      ...(myDeclines ?? []).map((d: any) => d.request_id),
    ])
    const unanswered = openRequests.filter((r: any) => !handledIds.has(r.id)).length
    setQuoteBadge(unanswered)
  }

  async function loadNotifications(uid: string) {
    const { data, error } = await supabase.from('user_notifications')
      .select('*').eq('user_id', uid)
      .order('created_at', { ascending: false }).limit(15)
    if (error) { console.error('LOAD NOTIFICATIONS FAILED:', error); return }
    if (data) setNotifications(data)
  }

  async function markRead(id: string) {
    const { error } = await supabase.from('user_notifications')
      .update({ read_at: new Date().toISOString() }).eq('id', id)
    if (error) { console.error('MARK READ FAILED:', error); return }
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  // Close the bell dropdown when clicking outside it
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  // Refresh badge every 30 seconds
  useEffect(() => {
    if (!providerId) return
    const interval = setInterval(() => {
      loadBadge(providerId)
      if (userId) loadNotifications(userId)
    }, 30000)
    return () => clearInterval(interval)
  }, [providerId, userId])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  // Bottom tab bar. Originally capped at 6 to stay thumb-sized on a phone;
  // "Log a transfer" was promoted here as the 7th tab because it is now a
  // primary provider action (bulk booking entry), not an occasional one.
  // Planner takes the slot Reviews had: providers check their schedule daily,
  // reviews rarely. Reviews stays one tap away in the full menu below.
  //
  // Trailing slashes are REQUIRED here. usePathname() reports the path with a
  // trailing slash, so hrefs written without one never satisfy
  // `pathname === item.href` and no tab is ever marked active — every label
  // stayed at the inactive colour, including the page being viewed. The admin
  // layout has always used trailing slashes, which is why its highlighting
  // worked and this one did not.
  const navItems = [
    { href:'/provider/', label:t.dashboard },
    { href:'/provider/planner/', label:t.planner },
    { href:'/provider/bookings/', label:t.bookings },
    { href:'/provider/drivers/', label:t.drivers },
    { href:'/provider/vehicles/', label:t.fleet },
    { href:'/provider/quotes/', label:t.quotes, badge: quoteBadge },
    { href:'/provider/log-transfers/', label:t.logTransfer },
  ]

  // Full menu — everything, including occasional actions
  const menuItems = [
    ...navItems,
    { href:'/provider/reviews/', label:t.reviews },
    { href:'/provider/prices/', label:t.defaultPrices },
  ]

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', color:'#f0ede6'}}>
      {/* Top bar */}
      <div style={{backgroundColor:'#1a1f26', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'52px', position:'sticky', top:0, zIndex:40}}>
        <div style={{fontSize:'13px', fontWeight:'500'}}>{providerName}</div>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          {quoteBadge > 0 && (
            <Link href="/provider/quotes/" style={{textDecoration:'none'}}>
              <div style={{display:'flex', alignItems:'center', gap:'6px', backgroundColor:'rgba(244,185,66,0.15)', border:'1px solid rgba(244,185,66,0.3)', borderRadius:'20px', padding:'4px 10px'}}>
                <span style={{fontSize:'11px', color:'#f4b942', fontWeight:'500'}}>
                  {quoteBadge} {quoteBadge > 1 ? t.newQuotes : t.newQuote}
                </span>
              </div>
            </Link>
          )}
          {/* Language toggle — providers are Turkish. The choice is stored in
              localStorage by useProviderLang, so it persists across pages and
              future visits rather than resetting on navigation. */}
          <div style={{display:'flex', alignItems:'center', gap:'2px'}}>
            {(['en','tr'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                aria-label={l === 'tr' ? 'Türkçe' : 'English'}
                style={{background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
                  color: lang===l ? '#ffffff' : 'rgba(255,255,255,0.4)',
                  fontWeight: lang===l ? 700 : 400, fontSize:'11px', fontFamily:'inherit'}}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Notifications bell — mirrors the customer bell in components/ui/Nav */}
          <div ref={bellRef} style={{position:'relative'}}>
            <button onClick={() => setNotifOpen(!notifOpen)} aria-label="Notifications"
              style={{position:'relative', width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', borderRadius:'50%'}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {unreadCount > 0 && (
                <span style={{position:'absolute', top:'2px', right:'2px', minWidth:'16px', height:'16px', padding:'0 4px', background:'#f4b942', color:'#0f1419', fontSize:'10px', fontWeight:700, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #1a1f26'}}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div style={{position:'absolute', top:'calc(100% + 8px)', right:0, width:'320px', maxWidth:'calc(100vw - 32px)', maxHeight:'400px', overflow:'auto', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:50}}>
                <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                  <span style={{fontSize:'12px', fontWeight:600, color:'#ffffff', textTransform:'uppercase', letterSpacing:'0.05em'}}>{t.notifications}</span>
                </div>
                {notifications.length === 0 ? (
                  <div style={{padding:'24px 16px', textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.4)'}}>{t.noNotifications}</div>
                ) : notifications.map(n => (
                  <Link key={n.id} href={n.link || '#'} onClick={() => { markRead(n.id); setNotifOpen(false) }}
                    style={{display:'block', padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.05)', textDecoration:'none', backgroundColor: n.read_at ? 'transparent' : 'rgba(244,185,66,0.05)'}}>
                    <div style={{display:'flex', alignItems:'flex-start', gap:'10px'}}>
                      {!n.read_at && <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'#f4b942', marginTop:'5px', flexShrink:0}} />}
                      <div style={{flex:1}}>
                        <div style={{fontSize:'13px', fontWeight:500, color:'#ffffff', marginBottom:'2px'}}>{n.title}</div>
                        {n.body && <div style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', lineHeight:'1.4'}}>{n.body}</div>}
                        <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'4px'}}>
                          {new Date(n.created_at).toLocaleDateString('en-GB',{day:'2-digit',month:'short'})} {new Date(n.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
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
          {menuItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
              display:'flex', alignItems:'center', justifyContent:'space-between',
              padding:'16px 20px', fontSize:'16px',
              color:pathname===item.href?'#f4b942':'rgba(255,255,255,0.8)',
              borderBottom:'1px solid rgba(255,255,255,0.06)', textDecoration:'none',
              fontWeight:pathname===item.href?'500':'400',
            }}>
              {item.label}
              {(item as any).badge && (item as any).badge > 0 ? (
                <span style={{backgroundColor:'#f4b942', color:'#0f1419', borderRadius:'10px', padding:'2px 8px', fontSize:'11px', fontWeight:'600'}}>
                  {(item as any).badge}
                </span>
              ) : null}
            </Link>
          ))}
          <button onClick={handleSignOut} style={{display:'block', width:'100%', padding:'16px 20px', fontSize:'16px', color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', textAlign:'left', marginTop:'8px'}}>
            {t.signOut}
          </button>
        </div>
      )}

      {/* Bottom tab bar. The bar itself spans the window so the background and
          top border reach both edges, but the tabs inside are capped at the same
          820px the pages use and centred. Without the cap, flex:1 stretches six
          tabs across a desktop window and the labels drift far apart. */}
      <div style={{position:'fixed', bottom:0, left:0, right:0, backgroundColor:'#1a1f26', borderTop:'1px solid rgba(255,255,255,0.08)', zIndex:20, paddingBottom:'env(safe-area-inset-bottom)'}}>
        <div style={{display:'flex', maxWidth:'820px', margin:'0 auto', width:'100%'}}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} style={{
              flex:1, padding:'10px 0', textAlign:'center', textDecoration:'none',
              fontSize:'10px', letterSpacing:'0.05em', position:'relative',
              color:pathname===item.href?'#f4b942':'rgba(244,185,66,0.6)',
              fontWeight:pathname===item.href?'600':'400',
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
      </div>

      <div style={{paddingBottom:'60px'}}>{children}</div>
    </div>
  )
}
