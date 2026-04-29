'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

const S = {
  page: { minHeight:'100vh', background:'#0f1419', display:'flex' as const, flexDirection:'column' as const, alignItems:'center' as const, justifyContent:'center' as const, padding:'24px 16px', boxSizing:'border-box' as const },
  card: { width:'100%', maxWidth:'400px', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px 24px', boxSizing:'border-box' as const },
  label: { display:'block' as const, fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', marginBottom:'6px' },
  input: { display:'block' as const, width:'100%', boxSizing:'border-box' as const, fontSize:'16px', padding:'14px 12px', background:'#2a2f36', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#ffffff', outline:'none', fontFamily:'inherit' },
  btn: (on: boolean) => ({ display:'block' as const, width:'100%', boxSizing:'border-box' as const, padding:'15px', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase' as const, fontFamily:'inherit', background: on ? '#f4b942' : '#3a3520', color: on ? '#0f1419' : '#666340', cursor: on ? 'pointer' as const : 'not-allowed' as const }),
}

const LogoLink = () => (
  <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'32px'}}>
    <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
    <span style={{fontSize:'12px', fontWeight:700, letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
  </Link>
)

function ResetContent() {
  const router = useRouter()
  const supabase = createClient() as any
  const [mode, setMode] = useState<'request'|'set'>('request')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') setMode('set')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest() {
    if (!email || loading) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo:`${window.location.origin}/auth/reset/` })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  async function handleSet() {
    if (!password || loading) return
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Min. 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.replace('/auth/signin/')
  }

  if (done) return (
    <div style={{...S.page, textAlign:'center'}}>
      <LogoLink />
      <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
      <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
      <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
        Reset link sent to <strong style={{color:'rgba(255,255,255,0.8)'}}>{email}</strong>. Expires in 1 hour.
      </p>
      <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
    </div>
  )

  if (mode === 'set') return (
    <div style={S.page}>
      <LogoLink />
      <div style={S.card}>
        <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Set new password</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>Choose a strong password</p>
        <div style={{marginBottom:'16px'}}>
          <label style={S.label}>New password</label>
          <input type="password" value={password} placeholder="Min. 8 characters" onChange={e => setPassword(e.target.value)} style={S.input} />
        </div>
        <div style={{marginBottom:'24px'}}>
          <label style={S.label}>Confirm password</label>
          <input type="password" value={confirm} placeholder="Repeat password" onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSet()} style={S.input} />
        </div>
        {error && <div style={{background:'rgba(162,45,45,0.3)', border:'1px solid #A32D2D', borderRadius:'6px', padding:'12px', marginBottom:'16px', textAlign:'center', fontSize:'13px', color:'#f09595'}}>{error}</div>}
        <button onClick={handleSet} disabled={!password||!confirm||loading} style={S.btn(!!(password&&confirm&&!loading))}>
          {loading ? 'Saving...' : 'Set new password →'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <LogoLink />
      <div style={S.card}>
        <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Forgot password?</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>Enter your email for a reset link</p>
        <div style={{marginBottom:'24px'}}>
          <label style={S.label}>Email address</label>
          <input type="email" value={email} placeholder="you@email.com" autoComplete="email"
            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleRequest()} style={S.input} />
        </div>
        {error && <div style={{background:'rgba(162,45,45,0.3)', border:'1px solid #A32D2D', borderRadius:'6px', padding:'12px', marginBottom:'16px', textAlign:'center', fontSize:'13px', color:'#f09595'}}>{error}</div>}
        <button onClick={handleRequest} disabled={!email||loading} style={S.btn(!!(email&&!loading))}>
          {loading ? 'Sending...' : 'Send reset link →'}
        </button>
      </div>
      <p style={{marginTop:'20px', fontSize:'13px'}}>
        <Link href="/auth/signin/" style={{color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
      </p>
    </div>
  )
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', background:'#0f1419'}} />}>
      <ResetContent />
    </Suspense>
  )
}
