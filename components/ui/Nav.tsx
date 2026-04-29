'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const labels = {
  en: { transfers:'Transfers', quote:'Request a quote', how:'How it works', help:'Help', signin:'Sign in', signup:'Sign up', signout:'Sign out', dashboard:'Dashboard', admin:'Admin', myBookings:'My bookings', myQuotes:'My quotes' },
  tr: { transfers:'Transferler', quote:'Teklif iste', how:'Nasıl çalışır', help:'Yardım', signin:'Giriş', signup:'Kayıt ol', signout:'Çıkış', dashboard:'Panel', admin:'Yönetim', myBookings:'Rezervasyonlarım', myQuotes:'Tekliflerim' },
}

export default function Nav({ lang = 'en', onLangChange, variant = 'light' }: {
  lang?: 'en'|'tr'
  onLangChange?: (l:'en'|'tr') => void
  variant?: 'light'|'overlay'
}) {
  const t = labels[lang]
  const router = useRouter()
  const supabase = createClient() as any
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string>('')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
        if (profile) setRole(profile.role)
      }
    }
    load()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      if (session?.user) {
        setUser(session.user)
        supabase.from('users').select('role').eq('id', session.user.id).single()
          .then(({ data }: any) => { if (data) setRole(data.role) })
      } else { setUser(null); setRole('') }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null); setRole(''); setMenuOpen(false)
    router.push('/'); router.refresh()
  }

  const isOverlay = variant === 'overlay'
  const bg = isOverlay ? 'rgba(15,20,25,0.95)' : '#ffffff'
  const borderColor = isOverlay ? 'rgba(255,255,255,0.1)' : '#e5e3dd'
  const burgerColor = isOverlay ? '#ffffff' : '#0f1419'
  const textColor = isOverlay ? 'rgba(255,255,255,0.75)' : '#5a574f'

  const menuLink = (href: string, label: string) => (
    <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{
      color:'rgba(255,255,255,0.85)', fontSize:'16px', padding:'15px 0',
      borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none',
      display:'block',
    }}>{label}</Link>
  )

  return (
    <nav style={{backgroundColor:bg, borderBottom:`1px solid ${borderColor}`, position:'relative', zIndex:30}}>
      <div style={{maxWidth:'1280px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'56px'}}>
        {/* Logo */}
        <Link href="/" style={{fontSize:'13px', fontWeight:'600', letterSpacing:'0.18em', color: isOverlay ? '#ffffff' : '#0f1419', textDecoration:'none'}}>
          dalaman.me
        </Link>

        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          {/* Language toggle */}
          {onLangChange && (
            <div style={{display:'flex', gap:'2px', fontSize:'11px'}}>
              {(['en','tr'] as const).map((l, i) => (
                <span key={l} style={{display:'flex', alignItems:'center', gap:'4px'}}>
                  {i > 0 && <span style={{color:'rgba(255,255,255,0.2)', margin:'0 2px'}}>·</span>}
                  <button onClick={() => onLangChange(l)} style={{
                    background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
                    color: lang===l ? (isOverlay ? '#ffffff' : '#0f1419') : textColor,
                    fontWeight: lang===l ? '600' : '400', fontSize:'11px', letterSpacing:'0.08em',
                  }}>{l.toUpperCase()}</button>
                </span>
              ))}
            </div>
          )}

          {/* Sign in button — always visible when not logged in */}
          {!user && (
            <Link href="/auth/signin/" style={{
              fontSize:'11px', fontWeight:'600', letterSpacing:'0.08em', textTransform:'uppercase',
              backgroundColor:'#f4b942', color:'#0f1419', padding:'8px 16px',
              borderRadius:'4px', textDecoration:'none', whiteSpace:'nowrap',
            }}>{t.signin}</Link>
          )}

          {/* Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background:'none', border:'none', cursor:'pointer', padding:'6px',
            display:'flex', flexDirection:'column', gap:'5px',
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width:'22px', height:'1.5px', backgroundColor:burgerColor, transition:'all 0.2s',
                opacity: menuOpen && i===1 ? 0 : 1,
                transform: menuOpen
                  ? i===0 ? 'rotate(45deg) translate(4px,4px)'
                  : i===2 ? 'rotate(-45deg) translate(4px,-4px)' : 'none'
                  : 'none',
              }} />
            ))}
          </button>
        </div>
      </div>

      {/* Full screen menu */}
      {menuOpen && (
        <div style={{
          position:'fixed', top:'56px', left:0, right:0, bottom:0, zIndex:100,
          backgroundColor:'#0f1419', overflowY:'auto',
          padding:'8px 24px 32px',
        }}>
          {/* Navigation links */}
          {menuLink('/', t.transfers)}
          {menuLink('/quote/', t.quote)}
          {menuLink('/how-it-works/', t.how)}
          {menuLink('/help/', t.help)}

          {/* Logged in customer */}
          {user && role === 'customer' && (
            <>
              {menuLink('/bookings/', t.myBookings)}
              {menuLink('/quotes/', t.myQuotes)}
            </>
          )}

          {/* Provider */}
          {user && role === 'provider' && menuLink('/provider/', t.dashboard)}

          {/* Driver */}
          {user && role === 'driver' && menuLink('/driver/', 'My trips')}

          {/* Admin */}
          {user && role === 'admin' && menuLink('/admin/', t.admin)}

          {/* Auth actions */}
          <div style={{marginTop:'16px', paddingTop:'16px', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
            {user ? (
              <button onClick={handleSignOut} style={{
                background:'none', border:'none', cursor:'pointer', padding:'0',
                color:'rgba(255,255,255,0.45)', fontSize:'15px',
              }}>{t.signout}</button>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                <Link href="/auth/signin/" onClick={() => setMenuOpen(false)} style={{
                  color:'rgba(255,255,255,0.85)', fontSize:'16px', textDecoration:'none', fontWeight:'500',
                }}>{t.signin}</Link>
                <Link href="/auth/signup/" onClick={() => setMenuOpen(false)} style={{
                  display:'inline-block', backgroundColor:'#f4b942', color:'#0f1419',
                  padding:'12px 24px', borderRadius:'4px', textDecoration:'none',
                  fontSize:'14px', fontWeight:'600', letterSpacing:'0.06em',
                  textTransform:'uppercase', textAlign:'center',
                }}>{t.signup} →</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
