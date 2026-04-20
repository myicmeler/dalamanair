'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const labels = {
  en: { transfers:'Transfers', how:'How it works', help:'Help', signin:'Sign in', signup:'Sign up', signout:'Sign out', dashboard:'Dashboard', admin:'Admin' },
  tr: { transfers:'Transferler', how:'Nasıl çalışır', help:'Yardım', signin:'Giriş', signup:'Kayıt ol', signout:'Çıkış', dashboard:'Panel', admin:'Yönetim' },
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
  const logoColor = '#ffffff'
  const linkColor = isOverlay ? 'rgba(255,255,255,0.75)' : '#5a574f'
  const burgerColor = isOverlay ? '#ffffff' : '#0f1419'

  return (
    <nav style={{backgroundColor:bg, borderBottom:`1px solid ${borderColor}`, position:'relative', zIndex:30}}>
      <div style={{maxWidth:'1280px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'56px'}}>
        <Link href="/" style={{fontSize:'12px', fontWeight:'500', letterSpacing:'0.22em', color: isOverlay ? logoColor : '#0f1419', textDecoration:'none'}}>
          DALAMANAIR
        </Link>

        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          {onLangChange && (
            <div style={{display:'flex', gap:'6px', fontSize:'11px', letterSpacing:'0.1em'}}>
              {(['en','tr'] as const).map((l, i) => (
                <span key={l} style={{display:'flex', alignItems:'center', gap:'6px'}}>
                  {i > 0 && <span style={{color: isOverlay ? 'rgba(255,255,255,0.3)' : '#e5e3dd'}}>·</span>}
                  <button onClick={() => onLangChange(l)} style={{
                    background:'none', border:'none', cursor:'pointer', padding:'0',
                    color: lang===l ? (isOverlay ? '#ffffff' : '#0f1419') : linkColor,
                    fontWeight: lang===l ? '500' : '400'
                  }}>{l.toUpperCase()}</button>
                </span>
              ))}
            </div>
          )}

          {!user && (
            <Link href="/auth/signin" style={{
              fontSize:'11px', fontWeight:'500', letterSpacing:'0.08em', textTransform:'uppercase',
              backgroundColor:'#f4b942', color:'#0f1419', padding:'8px 14px',
              borderRadius:'3px', textDecoration:'none'
            }}>{t.signin}</Link>
          )}

          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background:'none', border:'none', cursor:'pointer', padding:'4px',
            display:'flex', flexDirection:'column', gap:'5px'
          }}>
            {[0,1,2].map(i => (
              <div key={i} style={{width:'22px', height:'1.5px', backgroundColor:burgerColor, transition:'all 0.2s',
                transform: menuOpen ? (i===0 ? 'rotate(45deg) translate(4px,4px)' : i===2 ? 'rotate(-45deg) translate(4px,-4px)' : 'opacity:0') : 'none',
                opacity: menuOpen && i===1 ? 0 : 1
              }} />
            ))}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{
          position:'absolute', top:'56px', left:0, right:0, zIndex:100,
          backgroundColor:'#0f1419', borderTop:'1px solid rgba(255,255,255,0.1)',
          padding:'16px 20px', display:'flex', flexDirection:'column', gap:'0'
        }}>
          {[
            { href:'/', label:t.transfers },
            { href:'/how-it-works', label:t.how },
            { href:'/help', label:t.help },
          ].map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
              color:'rgba(255,255,255,0.8)', fontSize:'15px', padding:'14px 0',
              borderBottom:'1px solid rgba(255,255,255,0.08)', textDecoration:'none'
            }}>{item.label}</Link>
          ))}
          {user && role === 'provider' && (
            <Link href="/provider" onClick={() => setMenuOpen(false)} style={{color:'rgba(255,255,255,0.8)', fontSize:'15px', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', textDecoration:'none'}}>{t.dashboard}</Link>
          )}
          {user && role === 'admin' && (
            <Link href="/admin" onClick={() => setMenuOpen(false)} style={{color:'rgba(255,255,255,0.8)', fontSize:'15px', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.08)', textDecoration:'none'}}>{t.admin}</Link>
          )}
          {user ? (
            <button onClick={handleSignOut} style={{
              color:'rgba(255,255,255,0.6)', fontSize:'15px', padding:'14px 0',
              background:'none', border:'none', cursor:'pointer', textAlign:'left'
            }}>{t.signout}</button>
          ) : (
            <Link href="/auth/signup" onClick={() => setMenuOpen(false)} style={{
              color:'#f4b942', fontSize:'15px', padding:'14px 0', textDecoration:'none', fontWeight:'500'
            }}>{t.signup} →</Link>
          )}
        </div>
      )}
    </nav>
  )
}
