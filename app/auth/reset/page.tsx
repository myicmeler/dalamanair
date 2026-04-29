'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

const page: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0f1419',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px 16px',
  boxSizing: 'border-box',
}

const card: React.CSSProperties = {
  width: '100%',
  maxWidth: '400px',
  background: '#1a1f26',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '32px 24px',
  boxSizing: 'border-box',
}

const inp: React.CSSProperties = {
  display: 'block',
  width: '100%',
  boxSizing: 'border-box',
  fontSize: '16px',
  padding: '14px',
  background: 'rgba(255,255,255,0.07)',
  border: '1px solid rgba(255,255,255,0.12)',
  borderRadius: '6px',
  color: '#ffffff',
  outline: 'none',
  marginTop: '8px',
  appearance: 'none' as any,
}

const lbl: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.4)',
}

const Logo = () => (
  <Link href="/" style={{fontSize:'13px', fontWeight:'700', letterSpacing:'0.2em', color:'#ffffff', textDecoration:'none', marginBottom:'40px', display:'block'}}>
    dalaman.me
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
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset/`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  async function handleSet() {
    if (!password || loading) return
    if (password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.replace('/auth/signin/?reset=success')
  }

  if (done) return (
    <div style={{...page, textAlign:'center'}}>
      <Logo />
      <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
      <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
      <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
        Reset link sent to <strong style={{color:'rgba(255,255,255,0.8)'}}>{email}</strong>. It expires in 1 hour.
      </p>
      <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
    </div>
  )

  if (mode === 'set') return (
    <div style={page}>
      <Logo />
      <div style={card}>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Set new password</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 28px'}}>Choose a strong password</p>
        <div style={{marginBottom:'16px'}}>
          <label style={lbl}>New password</label>
          <input type="password" value={password} placeholder="Min. 8 characters" onChange={e => setPassword(e.target.value)} style={inp} />
        </div>
        <div style={{marginBottom:'24px'}}>
          <label style={lbl}>Confirm password</label>
          <input type="password" value={confirm} placeholder="Repeat password" onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSet()} style={inp} />
        </div>
        {error && <div style={{background:'rgba(162,45,45,0.2)', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'6px', padding:'12px 14px', marginBottom:'16px'}}><p style={{fontSize:'13px', color:'#f09595', margin:0, textAlign:'center'}}>{error}</p></div>}
        <button onClick={handleSet} disabled={!password||!confirm||loading} style={{display:'block', width:'100%', boxSizing:'border-box', padding:'15px', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:'700', letterSpacing:'0.06em', textTransform:'uppercase', cursor:!password||!confirm||loading?'not-allowed':'pointer', background:!password||!confirm||loading?'rgba(244,185,66,0.3)':'#f4b942', color:!password||!confirm||loading?'rgba(255,255,255,0.3)':'#0f1419'}}>
          {loading ? 'Saving...' : 'Set new password →'}
        </button>
      </div>
    </div>
  )

  return (
    <div style={page}>
      <Logo />
      <div style={card}>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Forgot password?</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 28px'}}>
          Enter your email and we&apos;ll send a reset link
        </p>
        <div style={{marginBottom:'24px'}}>
          <label style={lbl}>Email address</label>
          <input type="email" value={email} placeholder="you@email.com" autoComplete="email"
            onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleRequest()} style={inp} />
        </div>
        {error && <div style={{background:'rgba(162,45,45,0.2)', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'6px', padding:'12px 14px', marginBottom:'16px'}}><p style={{fontSize:'13px', color:'#f09595', margin:0, textAlign:'center'}}>{error}</p></div>}
        <button onClick={handleRequest} disabled={!email||loading} style={{display:'block', width:'100%', boxSizing:'border-box', padding:'15px', border:'none', borderRadius:'6px', fontSize:'14px', fontWeight:'700', letterSpacing:'0.06em', textTransform:'uppercase', cursor:!email||loading?'not-allowed':'pointer', background:!email||loading?'rgba(244,185,66,0.3)':'#f4b942', color:!email||loading?'rgba(255,255,255,0.3)':'#0f1419'}}>
          {loading ? 'Sending...' : 'Send reset link →'}
        </button>
      </div>
      <p style={{marginTop:'20px', fontSize:'13px'}}>
        <Link href="/auth/signin/" style={{color:'rgba(255,255,255,0.35)', textDecoration:'underline'}}>← Back to sign in</Link>
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
