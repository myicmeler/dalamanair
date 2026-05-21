'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const labels = {
  en: { transfers:'Transfers', quote:'Request a quote', how:'How it works', help:'Help', signin:'Sign in', signup:'Sign up', signout:'Sign out', dashboard:'Dashboard', admin:'Admin', myBookings:'My bookings', myQuotes:'My quotes', profile:'My profile', notifications:'Notifications', noNotif:'No new notifications', deactivate:'Deactivate account' },
  tr: { transfers:'Transferler', quote:'Teklif iste', how:'Nasıl çalışır', help:'Yardım', signin:'Giriş', signup:'Kayıt ol', signout:'Çıkış', dashboard:'Panel', admin:'Yönetim', myBookings:'Rezervasyonlarım', myQuotes:'Tekliflerim', profile:'Profilim', notifications:'Bildirimler', noNotif:'Yeni bildirim yok', deactivate:'Hesabı devre dışı bırak' },
}

export default function Nav({ lang = 'en', onLangChange }: {
  lang?: 'en'|'tr'
  onLangChange?: (l:'en'|'tr') => void
}) {
  const t = labels[lang]
  const router = useRouter()
  const supabase = createClient() as any
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('customer')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  async function fetchProfile(u: any) {
    const metaName = u.user_metadata?.full_name || ''
    setFullName(metaName)
    try {
      const { data } = await supabase.from('users').select('full_name, role').eq('id', u.id).single()
      if (data) { setFullName(data.full_name || metaName); setRole(data.role || 'customer') }
    } catch {}
  }

  async function fetchNotifications(userId: string) {
    try {
      const { data } = await supabase.from('user_notifications')
        .select('*').eq('user_id', userId)
        .order('created_at', { ascending: false }).limit(15)
      if (data) setNotifications(data)
    } catch {}
  }

  async function markRead(id: string) {
    await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? {...n, read_at: new Date().toISOString()} : n))
  }

  async function markAllRead() {
    if (!user) return
    const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id)
    if (unreadIds.length === 0) return
    await supabase.from('user_notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
    setNotifications(prev => prev.map(n => ({...n, read_at: n.read_at ?? new Date().toISOString()})))
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) {
        setUser(session.user); fetchProfile(session.user); fetchNotifications(session.user.id)
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      if (session?.user) { setUser(session.user); fetchProfile(session.user); fetchNotifications(session.user.id) }
      else { setUser(null); setFullName(''); setRole('customer'); setNotifications([]) }
    })

    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setNotifOpen(false)
    }
    document.addEventListener('mousedown', handleClick)

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      supabase.auth.getUser().then(({ data: { user: u } }: any) => {
        if (u) fetchNotifications(u.id)
      })
    }, 30000)

    return () => { subscription.unsubscribe(); document.removeEventListener('mousedown', handleClick); clearInterval(interval) }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null); setMenuOpen(false); setDropdownOpen(false)
    window.location.href = '/'
  }

  const initials = fullName ? fullName.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2) : user?.email?.[0]?.toUpperCase() || '?'
  const firstName = fullName?.split(' ')[0] || user?.email?.split('@')[0] || ''
  const unreadCount = notifications.filter(n => !n.read_at).length

  return (
    <nav style={{backgroundColor:'#0f1419', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'relative', zIndex:30}}>
      <div style={{maxWidth:'1280px', margin:'0 auto', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px'}}>
        <Link href="/" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
          <Image src="/logo.jpg" alt="dalaman.me" width={40} height={40} style={{borderRadius:'50%', objectFit:'cover'}} />
          <span style={{fontSize:'13px', fontWeight:700, letterSpacing:'0.12em', color:'#ffffff'}}>dalaman.me</span>
        </Link>

        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          {onLangChange && (
            <div style={{display:'flex', fontSize:'11px'}}>
              {(['en','tr'] as const).map((l, i) => (
                <span key={l} style={{display:'flex', alignItems:'center'}}>
                  {i > 0 && <span style={{color:'rgba(255,255,255,0.2)', margin:'0 4px'}}>·</span>}
                  <button onClick={() => onLangChange(l)} style={{background:'none', border:'none', cursor:'pointer', padding:'2px 4px', color: lang===l?'#ffffff':'rgba(255,255,255,0.4)', fontWeight: lang===l?700:400, fontSize:'11px'}}>
                    {l.toUpperCase()}
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Notification bell */}
          {user && (
            <div ref={bellRef} style={{position:'relative'}}>
              <button onClick={() => setNotifOpen(!notifOpen)} style={{position:'relative', width:'36px', height:'36px', display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', borderRadius:'50%'}}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && (
                  <span style={{position:'absolute', top:'2px', right:'2px', minWidth:'16px', height:'16px', padding:'0 4px', background:'#f4b942', color:'#0f1419', fontSize:'10px', fontWeight:700, borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #0f1419'}}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div style={{position:'absolute', top:'calc(100% + 8px)', right:0, width:'320px', maxHeight:'400px', overflow:'auto', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', zIndex:50}}>
                  <div style={{padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                    <span style={{fontSize:'12px', fontWeight:600, color:'#ffffff', textTransform:'uppercase', letterSpacing:'0.05em'}}>{t.notifications}</span>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{fontSize:'11px', color:'#f4b942', background:'none', border:'none', cursor:'pointer'}}>Mark all read</button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div style={{padding:'24px 16px', textAlign:'center', fontSize:'13px', color:'rgba(255,255,255,0.4)'}}>{t.noNotif}</div>
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
          )}

          {user ? (
            <div ref={dropdownRef} style={{position:'relative'}}>
              <button onClick={() => setDropdownOpen(!dropdownOpen)} style={{display:'flex', alignItems:'center', gap:'8px', background:'none', border:'none', cursor:'pointer', padding:'4px'}}>
                <div style={{width:'34px', height:'34px', borderRadius:'50%', background:'rgba(244,185,66,0.15)', border:'2px solid rgba(244,185,66,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:700, color:'#f4b942', flexShrink:0}}>
                  {initials}
                </div>
                <span style={{fontSize:'13px', fontWeight:500, color:'#ffffff', whiteSpace:'nowrap', display:'none'}} className="nav-name">{firstName}</span>
                <style>{`@media(min-width:640px){.nav-name{display:block!important}}`}</style>
              </button>
              {dropdownOpen && (
                <div style={{position:'absolute', top:'calc(100% + 8px)', right:0, width:'200px', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', boxShadow:'0 8px 24px rgba(0,0,0,0.5)', overflow:'hidden', zIndex:50}}>
                  <div style={{padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
                    <div style={{fontSize:'13px', fontWeight:500, color:'#ffffff', marginBottom:'2px'}}>{fullName || firstName}</div>
                    <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user.email}</div>
                  </div>
                  {[
                    { href:'/profile/', label: t.profile },
                    ...(role==='customer'?[{href:'/bookings/',label:t.myBookings},{href:'/quotes/',label:t.myQuotes}]:[]),
                    ...(role==='provider'?[{href:'/provider/',label:t.dashboard}]:[]),
                    ...(role==='driver'?[{href:'/driver/',label:'My trips'}]:[]),
                    ...(role==='admin'?[{href:'/admin/',label:t.admin}]:[]),
                  ].map(item => (
                    <Link key={item.href} href={item.href} onClick={() => setDropdownOpen(false)}
                      style={{display:'block', padding:'11px 16px', fontSize:'13px', color:'rgba(255,255,255,0.75)', textDecoration:'none', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                      {item.label}
                    </Link>
                  ))}
                  <Link href="/profile/#deactivate" onClick={() => setDropdownOpen(false)}
                    style={{display:'block', padding:'11px 16px', fontSize:'13px', color:'rgba(162,45,45,0.7)', textDecoration:'none', borderBottom:'1px solid rgba(255,255,255,0.05)'}}>
                    {t.deactivate}
                  </Link>
                  <button onClick={handleSignOut} style={{display:'block', width:'100%', padding:'11px 16px', fontSize:'13px', color:'rgba(255,255,255,0.4)', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                    {t.signout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/signin/" style={{fontSize:'11px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor:'#f4b942', color:'#0f1419', padding:'8px 14px', borderRadius:'4px', textDecoration:'none', whiteSpace:'nowrap'}}>
              {t.signin}
            </Link>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} style={{background:'none', border:'none', cursor:'pointer', padding:'6px', display:'flex', flexDirection:'column', gap:'5px'}}>
            {[0,1,2].map(i => (
              <div key={i} style={{width:'22px', height:'1.5px', backgroundColor:'#ffffff', transition:'all 0.2s', opacity:menuOpen&&i===1?0:1, transform:menuOpen?(i===0?'rotate(45deg) translate(4px,4px)':i===2?'rotate(-45deg) translate(4px,-4px)':'none'):'none'}} />
            ))}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{position:'fixed', top:'60px', left:0, right:0, bottom:0, zIndex:100, backgroundColor:'#0f1419', overflowY:'auto', padding:'16px 24px 40px'}}>
          {user && (
            <div style={{display:'flex', alignItems:'center', gap:'12px', padding:'12px 0 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:'8px'}}>
              <div style={{width:'48px', height:'48px', borderRadius:'50%', background:'rgba(244,185,66,0.15)', border:'2px solid rgba(244,185,66,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:'#f4b942', flexShrink:0}}>{initials}</div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'15px', fontWeight:500, color:'#ffffff', marginBottom:'2px'}}>{fullName || firstName}</div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user.email}</div>
              </div>
            </div>
          )}
          {[{href:'/',label:t.transfers},{href:'/quote/',label:t.quote},{href:'/how-it-works/',label:t.how},{href:'/help/',label:t.help}].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.8)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{item.label}</Link>
          ))}
          {user && <>
            <Link href="/profile/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.8)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.profile}</Link>
            {role==='customer'&&<><Link href="/bookings/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.8)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.myBookings}</Link><Link href="/quotes/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.8)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.myQuotes}</Link></>}
            {role==='provider'&&<Link href="/provider/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.8)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.dashboard}</Link>}
            {role==='admin'&&<Link href="/admin/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.8)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.admin}</Link>}
          </>}
          <div style={{marginTop:'20px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
            {user ? (
              <Link href="/profile/#deactivate" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(162,45,45,0.7)', fontSize:'15px', textDecoration:'none', marginBottom:'12px'}}>{t.deactivate}</Link>
              <button onClick={handleSignOut} style={{background:'none', border:'none', cursor:'pointer', padding:0, color:'rgba(255,255,255,0.4)', fontSize:'15px', fontFamily:'inherit'}}>{t.signout}</button>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                <Link href="/auth/signin/" onClick={() => setMenuOpen(false)} style={{color:'rgba(255,255,255,0.8)', fontSize:'16px', textDecoration:'none', fontWeight:500}}>{t.signin}</Link>
                <Link href="/auth/signup/" onClick={() => setMenuOpen(false)} style={{display:'inline-block', backgroundColor:'#f4b942', color:'#0f1419', padding:'12px 24px', borderRadius:'4px', textDecoration:'none', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', textAlign:'center'}}>{t.signup} →</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}