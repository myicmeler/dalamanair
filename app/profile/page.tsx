'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient() as any
  const fileRef = useRef<HTMLInputElement>(null)
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState({ full_name:'', phone:'', avatar_url:'' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/auth/signin/?redirect=/profile/'); return }
      setUser(user)
      const { data } = await supabase.from('users').select('full_name, phone, avatar_url').eq('id', user.id).single()
      if (data) setProfile({ full_name: data.full_name || '', phone: data.phone || '', avatar_url: data.avatar_url || '' })
      setLoading(false)
    }
    load()
  }, [])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return
    setUploading(true); setError('')
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
      const avatarUrl = `${publicUrl}?t=${Date.now()}`
      await supabase.from('users').upsert({ id: user.id, email: user.email, avatar_url: avatarUrl })
      setProfile(p => ({ ...p, avatar_url: avatarUrl }))
    } catch (err: any) {
      setError(err.message)
    }
    setUploading(false)
  }

  async function handleSave() {
    if (!user) return
    setSaving(true); setError('')
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: profile.full_name,
      phone: profile.phone,
    })
    if (error) { setError(error.message); setSaving(false); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    setSaving(false)
  }

  const inp: React.CSSProperties = { display:'block', width:'100%', boxSizing:'border-box', fontSize:'15px', padding:'13px 14px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#ffffff', outline:'none', fontFamily:'inherit' }
  const lbl: React.CSSProperties = { display:'block', fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'6px' }

  if (loading) return <div style={{minHeight:'100vh', background:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', color:'rgba(255,255,255,0.3)'}}>Loading...</div>

  const initials = profile.full_name ? profile.full_name.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2) : '?'

  return (
    <div style={{minHeight:'100vh', background:'#0f1419'}}>
      {/* Simple nav */}
      <div style={{backgroundColor:'rgba(15,20,25,0.95)', borderBottom:'1px solid rgba(255,255,255,0.08)', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'60px'}}>
        <Link href="/" style={{display:'flex', alignItems:'center', gap:'10px', textDecoration:'none'}}>
          <Image src="/logo.jpg" alt="dalaman.me" width={36} height={36} style={{borderRadius:'50%', objectFit:'cover'}} />
          <span style={{fontSize:'13px', fontWeight:700, letterSpacing:'0.12em', color:'#ffffff'}}>dalaman.me</span>
        </Link>
        <Link href="/" style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', textDecoration:'none'}}>← Back</Link>
      </div>

      <div style={{maxWidth:'480px', margin:'0 auto', padding:'40px 20px'}}>
        <h1 style={{fontSize:'24px', fontWeight:500, color:'#ffffff', marginBottom:'6px'}}>Your profile</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', marginBottom:'36px'}}>{user?.email}</p>

        {/* Avatar */}
        <div style={{display:'flex', alignItems:'center', gap:'20px', marginBottom:'32px', padding:'20px', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px'}}>
          <div style={{position:'relative', flexShrink:0}}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" style={{width:'80px', height:'80px', borderRadius:'50%', objectFit:'cover', border:'2px solid rgba(244,185,66,0.3)'}} />
            ) : (
              <div style={{width:'80px', height:'80px', borderRadius:'50%', background:'rgba(244,185,66,0.15)', border:'2px solid rgba(244,185,66,0.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px', fontWeight:700, color:'#f4b942'}}>
                {initials}
              </div>
            )}
          </div>
          <div>
            <p style={{fontSize:'14px', fontWeight:500, color:'#ffffff', marginBottom:'4px'}}>{profile.full_name || 'Your name'}</p>
            <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'12px'}}>
              {profile.avatar_url ? 'Click to change photo' : 'No photo yet — add one below'}
            </p>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{display:'none'}} />
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{padding:'8px 16px', background:'none', border:'1px solid rgba(244,185,66,0.4)', borderRadius:'5px', color:'#f4b942', fontSize:'12px', cursor:'pointer', fontFamily:'inherit'}}>
              {uploading ? 'Uploading...' : profile.avatar_url ? 'Change photo' : 'Upload photo'}
            </button>
          </div>
        </div>

        {/* Form */}
        <div style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'10px', padding:'24px', display:'flex', flexDirection:'column', gap:'16px'}}>
          <div>
            <label style={lbl}>Full name</label>
            <input style={inp} type="text" value={profile.full_name} placeholder="Tom Henriksen"
              onChange={e => setProfile(p => ({...p, full_name: e.target.value}))} />
          </div>
          <div>
            <label style={lbl}>Phone</label>
            <input style={inp} type="tel" value={profile.phone} placeholder="+47 900 00000"
              onChange={e => setProfile(p => ({...p, phone: e.target.value}))} />
          </div>
          <div>
            <label style={lbl}>Email</label>
            <input style={{...inp, opacity:0.5, cursor:'not-allowed'}} type="email" value={user?.email} disabled />
            <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'4px'}}>Email cannot be changed here</p>
          </div>

          {error && <div style={{background:'rgba(162,45,45,0.2)', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', color:'#f09595', textAlign:'center'}}>{error}</div>}

          {saved && <div style={{background:'rgba(29,158,117,0.15)', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'6px', padding:'10px 14px', fontSize:'13px', color:'#1D9E75', textAlign:'center'}}>✓ Profile saved</div>}

          <button onClick={handleSave} disabled={saving}
            style={{padding:'14px', background:saving ? '#b8892e' : '#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', cursor:saving?'not-allowed':'pointer', fontFamily:'inherit'}}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}
