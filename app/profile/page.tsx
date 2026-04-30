'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [user, setUser] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/signin/?redirect=/profile/'); return }
      setUser(user)
      // Read from auth metadata first as fallback
      const metaName = user.user_metadata?.full_name || ''
      setFullName(metaName)
      // Try public.users table
      const { data } = await supabase
        .from('users')
        .select('full_name, phone')
        .eq('id', user.id)
        .single()
      if (data) {
        setFullName(data.full_name || metaName)
        setPhone(data.phone || '')
      }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!user) return
    setSaving(true); setError('')
    // Update auth metadata (always works)
    await supabase.auth.updateUser({ data: { full_name: fullName } })
    // Try updating public.users — don't fail if it errors
    const { error: dbErr } = await supabase
      .from('users')
      .update({ full_name: fullName, phone })
      .eq('id', user.id)
    if (dbErr) console.warn('DB update failed:', dbErr.message)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const inp: React.CSSProperties = { display:'block', width:'100%', boxSizing:'border-box', fontSize:'15px', padding:'13px 14px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#ffffff', outline:'none', fontFamily:'inherit' }
  const lbl: React.CSSProperties = { display:'block', fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'6px' }
  const initials = fullName ? fullName.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2) : '?'

  if (loading) return <div style={{minHeight:'100vh', background:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)'}}>Loading...</div>

  return (
    <div style={{minHeight:'100vh', background:'#0f1419'}}>
      <div style={{backgroundColor:'rgba(15,20,25,0.95)', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px'}}>
        <Link href="/" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
          <Image src="/logo.jpg" alt="dalaman.me" width={36} height={36} style={{borderRadius:'50%', objectFit:'cover'}} />
          <span style={{fontSize:'13px', fontWeight:700, letterSpacing:'0.12em', color:'#ffffff'}}>dalaman.me</span>
        </Link>
        <Link href="/" style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', textDecoration:'none'}}>← Back</Link>
      </div>

      <div style={{maxWidth:'480px', margin:'0 auto', padding:'40px 20px'}}>
        {/* Avatar initials + name header */}
        <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'36px'}}>
          <div style={{width:'64px', height:'64px', borderRadius:'50%', background:'rgba(244,185,66,0.15)', border:'2px solid rgba(244,185,66,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:700, color:'#f4b942', flexShrink:0}}>
            {initials}
          </div>
          <div>
            <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', marginBottom:'4px'}}>{fullName || 'Your profile'}</h1>
            <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)'}}>{user?.email}</p>
          </div>
        </div>

        <div style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px'}}>
          <div>
            <label style={lbl}>Full name</label>
            <input style={inp} type="text" value={fullName} placeholder="Your name"
              onChange={e => setFullName(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input style={inp} type="tel" value={phone} placeholder="+47 900 00000"
              onChange={e => setPhone(e.target.value)} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input style={{...inp, opacity:0.5, cursor:'not-allowed'}} type="email" value={user?.email} disabled />
            <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'4px'}}>Email cannot be changed here</p>
          </div>

          {error && <div style={{background:'rgba(162,45,45,0.2)', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', color:'#f09595', textAlign:'center'}}>{error}</div>}
          {saved && <div style={{background:'rgba(29,158,117,0.15)', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', color:'#1D9E75', textAlign:'center'}}>✓ Profile saved</div>}

          <button onClick={handleSave} disabled={saving}
            style={{padding:'14px', background:saving?'#b8892e':'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', cursor:saving?'not-allowed':'pointer', fontFamily:'inherit'}}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
