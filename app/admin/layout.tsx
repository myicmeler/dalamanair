'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const navItems = [
  { href:'/admin',           label:'Overview' },
  { href:'/admin/bookings',  label:'Bookings' },
  { href:'/admin/providers', label:'Providers' },
  { href:'/admin/drivers',   label:'Drivers' },
  { href:'/admin/vehicles',  label:'Vehicles' },
  { href:'/admin/reviews',   label:'Reviews' },
  { href:'/admin/locations', label:'Locations' },
  { href:'/admin/users',     label:'Users' },
  { href:'/admin/import',    label:'↑ Import' },
  { href:'/admin/outreach',  label:'Outreach' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient() as any
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin?redirect=/admin'); return }
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
      if (!profile || profile.role !== 'admin') { router.push('/'); return }
      setLoading(false)
    }
    check()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.4)', fontSize:'14px'}}>
      Loading...
    </div>
  )

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', color:'#f0ede6'}}>
      {/* Top bar */}
      <div style={{backgroundColor:'#1a1f26', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 16px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'52px', position:'sticky', top:0, zIndex:40}}>
        <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
          <span style={{fontSize:'12px', fontWeight:'500', letterSpacing:'0.1em'}}>ADMIN</span>
          <span style={{fontSize:'10px', backgroundColor:'rgba(162,45,45,0.3)', color:'#f09595', padding:'2px 8px', borderRadius:'10px'}}>Platform</span>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <Link href="/" style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', textDecoration:'none'}}>← Site</Link>
          <button onClick={handleSignOut} style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', background:'none', border:'none', cursor:'pointer'}}>Sign out</button>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{background:'none', border:'none', cursor:'pointer', padding:'8px', display:'flex', flexDirection:'column', gap:'5px'}}>
            {[0,1,2].map(i => (
              <div key={i} style={{width:'20px', height:'1.5px', backgroundColor:'#f0ede6', opacity:menuOpen&&i===1?0:1, transition:'all 0.2s',
                transform:menuOpen?(i===0?'rotate(45deg) translate(4px,4px)':i===2?'rotate(-45deg) translate(4px,-4px)':'none'):'none'}} />
            ))}
          </button>
        </div>
      </div>

      {/* Full screen mobile menu */}
      {menuOpen && (
        <div style={{position:'fixed', top:'52px', left:0, right:0, bottom:0, backgroundColor:'#1a1f26', zIndex:30, padding:'8px 0', overflowY:'auto'}}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} style={{
              display:'block', padding:'16px 20px', fontSize:'16px',
              color:pathname===item.href?'#f4b942':'rgba(255,255,255,0.8)',
              borderBottom:'1px solid rgba(255,255,255,0.06)', textDecoration:'none',
              fontWeight:pathname===item.href?'500':'400',
            }}>{item.label}</Link>
          ))}
        </div>
      )}

      {/* Scrollable tab bar */}
      <div style={{display:'flex', overflowX:'auto', borderBottom:'1px solid rgba(255,255,255,0.08)', backgroundColor:'#1a1f26', padding:'0 16px', gap:'4px', scrollbarWidth:'none'}}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{
            padding:'12px 14px', fontSize:'12px', whiteSpace:'nowrap', textDecoration:'none',
            borderBottom:`2px solid ${pathname===item.href?'#f4b942':'transparent'}`,
            color:pathname===item.href?'#f4b942':'rgba(255,255,255,0.5)',
            fontWeight:pathname===item.href?'500':'400',
          }}>{item.label}</Link>
        ))}
      </div>

      <div>{children}</div>
    </div>
  )
}
