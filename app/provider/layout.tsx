'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href: '/provider', label: 'Dashboard' },
  { href: '/provider/bookings', label: 'Bookings' },
  { href: '/provider/drivers', label: 'Drivers' },
  { href: '/provider/vehicles', label: 'Fleet' },
  { href: '/provider/reviews', label: 'Reviews' },
  { href: '/provider/quotes', label: 'Quotes' },
]

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient() as any
  const [providerName, setProviderName] = useState('Provider')
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin?redirect=/provider'); return }
      const { data: provider } = await supabase.from('providers').select('company_name').eq('user_id', user.id).single()
      if (provider) setProviderName(provider.company_name)
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', color:'#f0ede6'}}>
      {/* Top bar */}
      <div style={{backgroundColor:'#1a1f26', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'52px', position:'sticky', top:0, zIndex:40}}>
        <div style={{fontSize:'13px', fontWeight:'500'}}>{providerName}</div>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{background:'none', border:'none', cursor:'pointer', padding:'8px', display:'flex', flexDirection:'column', gap:'5px'}}>
          {[0,1,2].map(i => (
            <div key={i} style={{width:'20px', height:'1.5px', backgroundColor:'#f0ede6', opacity: menuOpen&&i===1?0:1, transition:'all 0.2s',
              transform: menuOpen?(i===0?'rotate(45deg) translate(4px,4px)':i===2?'rotate(-45deg) translate(4px,-4px)':'none'):'none'}} />
          ))}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{position:'fixed', top:'52px', left:0, right:0, bottom:0, backgroundColor:'#1a1f26', zIndex:30, padding:'8px 0', overflowY:'auto'}}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
              display:'block', padding:'16px 20px', fontSize:'16px',
              color: pathname===item.href ? '#f4b942' : 'rgba(255,255,255,0.8)',
              borderBottom:'1px solid rgba(255,255,255,0.06)', textDecoration:'none',
              fontWeight: pathname===item.href ? '500' : '400',
            }}>{item.label}</Link>
          ))}
          <button onClick={handleSignOut} style={{display:'block', width:'100%', padding:'16px 20px', fontSize:'16px', color:'rgba(255,255,255,0.5)', background:'none', border:'none', cursor:'pointer', textAlign:'left', borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:'8px'}}>
            Sign out
          </button>
        </div>
      )}

      {/* Bottom tab bar for quick nav on mobile */}
      <div style={{position:'fixed', bottom:0, left:0, right:0, backgroundColor:'#1a1f26', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', zIndex:20, paddingBottom:'env(safe-area-inset-bottom)'}}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{
            flex:1, padding:'10px 0', textAlign:'center', textDecoration:'none',
            fontSize:'10px', letterSpacing:'0.05em',
            color: pathname===item.href ? '#f4b942' : 'rgba(255,255,255,0.4)',
            fontWeight: pathname===item.href ? '500' : '400',
          }}>{item.label}</Link>
        ))}
      </div>

      {/* Content with bottom padding for tab bar */}
      <div style={{paddingBottom:'60px'}}>
        {children}
      </div>
    </div>
  )
}
