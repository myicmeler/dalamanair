'use client'
import Link from 'next/link'
import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const labels = {
  en: { transfers:'Transfers', quote:'Request a quote', how:'How it works', help:'Help', signin:'Sign in', signup:'Sign up', signout:'Sign out', dashboard:'Dashboard', admin:'Admin', myBookings:'My bookings', myQuotes:'My quotes', profile:'My profile' },
  tr: { transfers:'Transferler', quote:'Teklif iste', how:'Nasıl çalışır', help:'Yardım', signin:'Giriş', signup:'Kayıt ol', signout:'Çıkış', dashboard:'Panel', admin:'Yönetim', myBookings:'Rezervasyonlarım', myQuotes:'Tekliflerim', profile:'Profilim' },
}

export default function Nav({ lang = 'en', onLangChange }: {
  lang?: 'en'|'tr'
  onLangChange?: (l:'en'|'tr') => void
}) {
  const t = labels[lang]
  const router = useRouter()
  const supabase = createClient() as any
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('customer')
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)

  async function fetchProfile(u: any) {
    const metaName = u.user_metadata?.full_name || ''
    setFullName(metaName)
    try {
      const { data } = await supabase.from('users').select('full_name, role').eq('id', u.id).single()
      if (data) { setFullName(data.full_name || metaName); setRole(data.role || 'customer') }
    } catch {}
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session?.user) { setUser(session.user); fetchProfile(session.user) }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      if (session?.user) { setUser(session.user); fetchProfile(session.user) }
      else { setUser(null); setFullName(''); setRole('customer') }
    })
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => { subscription.unsubscribe(); document.removeEventListener('mousedown', handleClick) }
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null); setMenuOpen(false); setDropdownOpen(false)
    window.location.href = '/'
  }

  const initials = fullName ? fullName.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2) : user?.email?.[0]?.toUpperCase() || '?'
  const firstName = fullName?.split(' ')[0] || user?.email?.split('@')[0] || ''

  const navLink = (href: string, label: string) => (
    <Link key={href} href={href} onClick={() => setMenuOpen(false)} style={{display:'block', color:'rgba(255,255,255,0.8)', fontSize:'16px', padding:'15px 0', borderBottom:'1px solid rgba(255,255,255,0.07)', textDecoration:'none'}}>
      {label}
    </Link>
  )

  return (
    <nav style={{backgroundColor:'#0f1419', borderBottom:'1px solid rgba(255,255,255,0.08)', position:'relative', zIndex:30}}>
      <div style={{maxWidth:'1280px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px'}}>
        <Link href="/" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
          <Image src="/logo.jpg" alt="dalaman.me" width={40} height={40} style={{borderRadius:'50%', objectFit:'cover'}} />
          <span style={{fontSize:'13px', fontWeight:700, letterSpacing:'0.12em', color:'#ffffff'}}>dalaman.me</span>
        </Link>

        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
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
                  <button onClick={handleSignOut} style={{display:'block', width:'100%', padding:'11px 16px', fontSize:'13px', color:'rgba(255,255,255,0.4)', textAlign:'left', background:'none', border:'none', cursor:'pointer', fontFamily:'inherit'}}>
                    {t.signout}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/auth/signin/" style={{fontSize:'11px', fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', backgroundColor:'#f4b942', color:'#0f1419', padding:'8px 16px', borderRadius:'4px', textDecoration:'none', whiteSpace:'nowrap'}}>
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
              <div style={{width:'48px', height:'48px', borderRadius:'50%', background:'rgba(244,185,66,0.15)', border:'2px solid rgba(244,185,66,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'16px', fontWeight:700, color:'#f4b942', flexShrink:0}}>
                {initials}
              </div>
              <div style={{minWidth:0}}>
                <div style={{fontSize:'15px', fontWeight:500, color:'#ffffff', marginBottom:'2px'}}>{fullName || firstName}</div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{user.email}</div>
              </div>
            </div>
          )}
          {navLink('/', t.transfers)}
          {navLink('/quote/', t.quote)}
          {navLink('/how-it-works/', t.how)}
          {navLink('/help/', t.help)}
          {user && <>
            {navLink('/profile/', t.profile)}
            {role==='customer'&&<>{navLink('/bookings/', t.myBookings)}{navLink('/quotes/', t.myQuotes)}</>}
            {role==='provider'&&navLink('/provider/', t.dashboard)}
            {role==='driver'&&navLink('/driver/', 'My trips')}
            {role==='admin'&&navLink('/admin/', t.admin)}
          </>}
          <div style={{marginTop:'20px', paddingTop:'20px', borderTop:'1px solid rgba(255,255,255,0.1)'}}>
            {user ? (
              <button onClick={handleSignOut} style={{background:'none', border:'none', cursor:'pointer', padding:0, color:'rgba(255,255,255,0.4)', fontSize:'15px', fontFamily:'inherit'}}>{t.signout}</button>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                {navLink('/auth/signin/', t.signin)}
                <Link href="/auth/signup/" onClick={() => setMenuOpen(false)} style={{display:'inline-block', backgroundColor:'#f4b942', color:'#0f1419', padding:'12px 24px', borderRadius:'4px', textDecoration:'none', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', textAlign:'center'}}>{t.signup} →</Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
