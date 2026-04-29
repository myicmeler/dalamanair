'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

const S = {
  page: { minHeight:'100vh', background:'#0f1419', display:'flex' as const, flexDirection:'column' as const, alignItems:'center' as const, justifyContent:'center' as const, padding:'24px 16px', boxSizing:'border-box' as const },
  card: { width:'100%', maxWidth:'400px', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px 24px', boxSizing:'border-box' as const },
  label: { display:'block' as const, fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', marginBottom:'6px' },
  input: { display:'block' as const, width:'100%', boxSizing:'border-box' as const, fontSize:'16px', padding:'14px 12px', background:'#2a2f36', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#ffffff', outline:'none', fontFamily:'inherit' },
  btn: (on: boolean) => ({ display:'block' as const, width:'100%', boxSizing:'border-box' as const, padding:'15px', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' as const, fontFamily:'inherit', marginTop:'20px', background: on ? '#f4b942' : '#3a3520', color: on ? '#0f1419' : '#666340', cursor: on ? 'pointer' as const : 'not-allowed' as const }),
}

const LogoLink = () => (
  <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'32px'}}>
    <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
    <span style={{fontSize:'12px', fontWeight:700, letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
  </Link>
)

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
    if (data.session) router.replace('/')
    else { setSuccess(true); setLoading(false) }
  }

  if (success) return (
    <div style={{...S.page, textAlign:'center'}}>
      <LogoLink />
      <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
      <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
      <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
        Confirmation link sent to <strong style={{color:'rgba(255,255,255,0.8)'}}>{form.email}</strong>
      </p>
      <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
    </div>
  )

  const on = !!(form.email && form.password && form.fullName && !loading)

  return (
    <div style={S.page}>
      <LogoLink />
      <div style={S.card}>
        <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Create account</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>
          Already have one?{' '}
          <Link href="/auth/signin/" style={{color:'#f4b942', textDecoration:'none', fontWeight:500}}>Sign in</Link>
        </p>
        <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
          {[
            {label:'Full name *', key:'fullName', type:'text', ph:'Tom Henriksen'},
            {label:'Email *', key:'email', type:'email', ph:'you@email.com'},
            {label:'Phone', key:'phone', type:'tel', ph:'+47 900 00000'},
            {label:'Password *', key:'password', type:'password', ph:'Min. 8 characters'},
          ].map(f => (
            <div key={f.key}>
              <label style={S.label}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.key]} placeholder={f.ph}
                onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))}
                onKeyDown={e => e.key==='Enter' && handleSignUp()}
                style={S.input} />
            </div>
          ))}
        </div>
        {error && <div style={{background:'rgba(162,45,45,0.3)', border:'1px solid #A32D2D', borderRadius:'6px', padding:'12px', marginTop:'16px', textAlign:'center', fontSize:'13px', color:'#f09595'}}>{error}</div>}
        <button onClick={handleSignUp} disabled={!on} style={S.btn(on)}>
          {loading ? 'Creating...' : 'Create account →'}
        </button>
      </div>
    </div>
  )
}
