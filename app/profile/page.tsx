'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Nav from '@/components/ui/Nav'
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
  const [deactivateModal, setDeactivateModal] = useState(false)
  const [deactivating, setDeactivating] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/signin/?redirect=/profile/'); return }
      setUser(user)
      const metaName = user.user_metadata?.full_name || ''
      setFullName(metaName)
      const { data } = await supabase.from('users').select('full_name, phone').eq('id', user.id).single()
      if (data) { setFullName(data.full_name || metaName); setPhone(data.phone || '') }
      setLoading(false)
    }
    load()
  }, [])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    await supabase.auth.updateUser({ data: { full_name: fullName } })
    await supabase.from('users').update({ full_name: fullName, phone }).eq('id', user.id)
    setSaved(true); setTimeout(() => setSaved(false), 3000); setSaving(false)
  }

  async function handleDeactivate() {
    if (!user) return
    setDeactivating(true)
    await supabase.from('users').update({ is_active: false }).eq('id', user.id)
    await supabase.auth.signOut()
    router.replace('/?deactivated=1')
  }

  const inp = { display:'block' as const, width:'100%', fontSize:'16px', padding:'14px 12px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#ffffff', outline:'none', fontFamily:'inherit' }
  const lbl = { display:'block' as const, fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', marginBottom:'6px' }
  const initials = fullName ? fullName.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2) : '?'

  if (loading) return <div style={{minHeight:'100vh', background:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)'}}>Loading...</div>

  return (
    <div style={{minHeight:'100vh', background:'#0f1419'}}>
      <style>{`* { box-sizing: border-box; }`}</style>
      <Nav />
      <div style={{maxWidth:'480px', margin:'0 auto', padding:'32px 16px 48px'}}>
        <div style={{display:'flex', alignItems:'center', gap:'16px', marginBottom:'28px'}}>
          <div style={{width:'60px', height:'60px', borderRadius:'50%', background:'rgba(244,185,66,0.15)', border:'2px solid rgba(244,185,66,0.4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:700, color:'#f4b942', flexShrink:0}}>
            {initials}
          </div>
          <div>
            <h1 style={{fontSize:'clamp(18px,5vw,22px)', fontWeight:500, color:'#ffffff', marginBottom:'4px'}}>{fullName || 'Your profile'}</h1>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', wordBreak:'break-all'}}>{user?.email}</p>
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'20px', display:'flex', flexDirection:'column', gap:'16px'}}>
          <div><label style={lbl}>Full name</label><input style={inp} type="text" value={fullName} placeholder="Your name" onChange={e => setFullName(e.target.value)} /></div>
          <div><label style={lbl}>Phone</label><input style={inp} type="tel" value={phone} placeholder="+47 900 00000" onChange={e => setPhone(e.target.value)} /></div>
          <div><label style={lbl}>Email</label><input style={{...inp, opacity:0.5, cursor:'not-allowed'}} type="email" value={user?.email} disabled /><p style={{fontSize:'11px', color:'rgba(255,255,255,0.25)', marginTop:'4px'}}>Email cannot be changed here</p></div>
          {saved && <div style={{background:'rgba(29,158,117,0.15)', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', color:'#1D9E75', textAlign:'center'}}>✓ Profile saved</div>}
          <button onClick={handleSave} disabled={saving} style={{padding:'15px', background:saving?'#b8892e':'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', cursor:saving?'not-allowed':'pointer', fontFamily:'inherit'}}>
            {saving?'Saving...':'Save changes'}
          </button>
        </div>

        {/* Deactivate account */}
        <div style={{marginTop:'32px', paddingTop:'24px', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
          <p style={{fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'12px'}}>Account actions</p>
          <button onClick={() => setDeactivateModal(true)} style={{padding:'11px 20px', background:'none', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'6px', color:'#f09595', fontSize:'13px', cursor:'pointer', fontFamily:'inherit'}}>
            Deactivate my account
          </button>
        </div>
      </div>

      {/* Deactivate modal */}
      {deactivateModal && (
        <div style={{position:'fixed', inset:0, backgroundColor:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:50, padding:'20px'}}>
          <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'10px', padding:'28px', maxWidth:'420px', width:'100%'}}>
            <h2 style={{fontSize:'17px', fontWeight:'600', color:'#ffffff', marginBottom:'8px'}}>Deactivate your account?</h2>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', lineHeight:'1.6', marginBottom:'20px'}}>Your account will be deactivated and you will be signed out immediately. You will not be able to log in until an administrator reactivates your account. Your bookings and quote history will be preserved.</p>
            <div style={{display:'flex', gap:'10px'}}>
              <button onClick={() => setDeactivateModal(false)} style={{flex:1, padding:'12px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'13px', cursor:'pointer', fontFamily:'inherit'}}>
                Cancel
              </button>
              <button onClick={handleDeactivate} disabled={deactivating} style={{flex:1, padding:'12px', backgroundColor:'rgba(162,45,45,0.8)', color:'#ffffff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit'}}>
                {deactivating ? 'Deactivating...' : 'Yes, deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}