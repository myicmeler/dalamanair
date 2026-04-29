'use client'
import Link from 'next/link'
import Image from 'next/image'
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
  const borderColor = isOverlay ? 'rgba(255,255,255,0.08)' : '#e5e3dd'
  const burgerColor = isOverlay ? '#ffffff' : '#0f1419'
  const textColor = isOverlay ? 'rgba(255,255,255,0.75)' : '#5a574f'

  return (
    <nav style={{backgroundColor:bg, borderBottom:`1px solid ${borderColor}`, position:'relative', zIndex:30}}>
      <div style={{maxWidth:'1280px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px'}}>
        {/* Logo */}
        <Link href="/" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
          <Image
            src="/logo.jpg"
            alt="dalaman.me"
            width={40}
            height={40}
            style={{borderRadius:'50%', objectFit:'cover'}}
          />
          <span style={{fontSize:'13px', fontWeight:'700', letterSpacing:'0.12em', color: isOverlay ? '#ffffff' : '#0f1419'}}>
            dalaman.me
          </span>
        </Link>

        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          {/* Language toggle */}
          {onLangChange && (
            <div style={{display:'flex', gap:'2px', fontSize:'11px'}}>
              {(['en','tr'] as const).map((l, i) => (
                <span key={l} style={{display:'flex', alignItems:'center', gap:'4px'}}>
                  {i > 0 && <span style={{color:'rgba(128,128,128,0.4)', margin:'0 2px'}}>·</span>}
                  <button onClick={() => onLangChange(l)} style={{
                    background:'none', border:'none', cursor:'pointer', padding:'2px 4px',
                    color: lang===l ? (isOverlay ? '#ffffff' : '#0f1419') : textColor,
                    fontWeight: lang===l ? '700' : '400', fontSize:'11px', letterSpacing:'0.08em',
                  }}>{l.toUpperCase()}</button>
                </span>
              ))}
            </div>
          )}

          {/* Sign in */}
          {!user && (
            <Link href="/auth/signin/" style={{
              fontSize:'11px', fontWeight:'700', letterSpacing:'0.08em', textTransform:'uppercase',
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
                transform: menuOpen ? (i===0 ? 'rotate(45deg) translate(4px,4px)' : i===2 ? 'rotate(-45deg) translate(4px,-4px)' : 'none') : 'none',
              }} />
            ))}
          </button>
        </div>
      </div>

      {/* Full screen menu */}
      {menuOpen && (
        <div style={{
          position:'fixed', top:'60px', left:0, right:0, bottom:0, zIndex:100,
          backgroundColor:'#0f1419', overflowY:'auto', padding:'16px 24px 40px',
        }}>
          {/* Logo in menu */}
          <div style={{display:'flex', alignItems:'center', gap:'10px', padding:'8px 0 20px', borderBottom:'1px solid rgba(255,255,255,0.08)', marginBottom:'8px'}}>
            <Image src="/logo.jpg" alt="dalaman.me" width={48} height={48} style={{borderRadius:'50%', objectFit:'cover'}} />
            <div>
              <div style={{fontSize:'14px', fontWeight:'700', color:'#ffffff', letterSpacing:'0.1em'}}>dalaman.me</div>
              <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>Transfer app</div>
            </div>
          </div>

          {[
            { href:'/', label:t.transfers },
            { href:'/quote/', label:t.quote },
            { href:'/how-it-works/', label:t.how },
            { href:'/help/', label:t.help },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
              display:'block', color:'rgba(255,255,255,0.85)', fontSize:'16px',
              padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none',
            }}>{item.label}</Link>
          ))}

          {user && role === 'customer' && (
            <>
              <Link href="/bookings/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.85)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.myBookings}</Link>
              <Link href="/quotes/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.85)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.myQuotes}</Link>
            </>
          )}
          {user && role === 'provider' && (
            <Link href="/provider/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.85)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.dashboard}</Link>
          )}
          {user && role === 'driver' && (
            <Link href="/driver/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.85)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>My trips</Link>
          )}
          {user && role === 'admin' && (
            <Link href="/admin/" onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.85)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>{t.admin}</Link>
          )}

          <div style={{marginTop:'20px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
            {user ? (
              <button onClick={handleSignOut} style={{background:'none', border:'none', cursor:'pointer', padding:'0', color:'rgba(255,255,255,0.4)', fontSize:'15px'}}>
                {t.signout}
              </button>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                <Link href="/auth/signin/" onClick={() => setMenuOpen(false)} style={{color:'rgba(255,255,255,0.85)', fontSize:'16px', textDecoration:'none', fontWeight:'500'}}>{t.signin}</Link>
                <Link href="/auth/signup/" onClick={() => setMenuOpen(false)} style={{display:'inline-block', backgroundColor:'#f4b942', color:'#0f1419', padding:'12px 24px', borderRadius:'4px', textDecoration:'none', fontSize:'14px', fontWeight:'700', letterSpacing:'0.06em', textTransform:'uppercase', textAlign:'center'}}>
                  {t.signup} →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
