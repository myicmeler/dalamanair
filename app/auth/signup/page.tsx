'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const inp: React.CSSProperties = {
  display:'block', width:'100%', boxSizing:'border-box',
  fontSize:'16px', padding:'14px',
  background:'rgba(255,255,255,0.07)',
  border:'1px solid rgba(255,255,255,0.12)',
  borderRadius:'6px', color:'#ffffff',
  outline:'none', WebkitAppearance:'none' as any,
  marginTop:'8px',
}
const lbl: React.CSSProperties = {
  display:'block', fontSize:'11px', letterSpacing:'0.1em',
  textTransform:'uppercase', color:'rgba(255,255,255,0.4)',
}

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', password:'' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignUp() {
    if (!form.email || !form.password || !form.fullName || loading) return
    setLoading(true); setError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data:{ full_name: form.fullName }, emailRedirectTo:`${window.location.origin}/` }
    })
    if (error) { setError(error.message); setLoading(false); return }
    if (data.session) {
      if (form.phone) await supabase.from('users').update({ phone:form.phone, full_name:form.fullName }).eq('id', data.user!.id)
      router.replace('/')
    } else {
      setSuccess(true); setLoading(false)
    }
  }

  if (success) return (
    <div style={{minHeight:'100vh', background:'#0f1419', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', boxSizing:'border-box', textAlign:'center'}}>
      <Link href="/" style={{fontSize:'13px', fontWeight:'700', letterSpacing:'0.2em', color:'#ffffff', textDecoration:'none', marginBottom:'40px', display:'block'}}>dalaman.me</Link>
      <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
      <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
      <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', maxWidth:'340px', marginBottom:'24px'}}>
        We sent a confirmation link to <strong style={{color:'rgba(255,255,255,0.8)'}}>{form.email}</strong>. Click it to activate your account.
      </p>
      <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', background:'#0f1419', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'24px 16px', boxSizing:'border-box'}}>
      <Link href="/" style={{fontSize:'13px', fontWeight:'700', letterSpacing:'0.2em', color:'#ffffff', textDecoration:'none', marginBottom:'40px', display:'block'}}>dalaman.me</Link>
      <div style={{width:'100%', maxWidth:'400px', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px 24px', boxSizing:'border-box'}}>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Create account</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 28px'}}>
          Already have one?{' '}
          <Link href="/auth/signin/" style={{color:'#f4b942', textDecoration:'none', fontWeight:'500'}}>Sign in</Link>
        </p>
        <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
          {([
            {label:'Full name *', key:'fullName', type:'text', placeholder:'Tom Henriksen'},
            {label:'Email *', key:'email', type:'email', placeholder:'you@email.com'},
            {label:'Phone', key:'phone', type:'tel', placeholder:'+47 900 00000'},
            {label:'Password *', key:'password', type:'password', placeholder:'Min. 8 characters'},
          ] as const).map(f => (
            <div key={f.key}>
              <label style={lbl}>{f.label}</label>
              <input type={f.type} value={form[f.key as keyof typeof form]} placeholder={f.placeholder}
                onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={inp} />
            </div>
          ))}
        </div>
        {error && (
          <div style={{background:'rgba(162,45,45,0.2)', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'6px', padding:'12px 14px', marginTop:'16px'}}>
            <p style={{fontSize:'13px', color:'#f09595', margin:0, textAlign:'center'}}>{error}</p>
          </div>
        )}
        <button onClick={handleSignUp} disabled={loading||!form.email||!form.password||!form.fullName} style={{
          display:'block', width:'100%', boxSizing:'border-box', padding:'15px', border:'none', borderRadius:'6px',
          fontSize:'14px', fontWeight:'700', letterSpacing:'0.06em', textTransform:'uppercase', marginTop:'20px',
          cursor: loading||!form.email||!form.password||!form.fullName ? 'not-allowed' : 'pointer',
          background: loading||!form.email||!form.password||!form.fullName ? 'rgba(244,185,66,0.3)' : '#f4b942',
          color: loading||!form.email||!form.password||!form.fullName ? 'rgba(255,255,255,0.3)' : '#0f1419',
        }}>
          {loading ? 'Creating...' : 'Create account →'}
        </button>
      </div>
    </div>
  )
}
