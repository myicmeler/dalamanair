'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

const authStyles = `
  .auth-page { min-height:100vh; background:#0f1419 !important; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:24px 16px; box-sizing:border-box; }
  .auth-card { width:100%; max-width:400px; background:#1a1f26; border:1px solid rgba(255,255,255,0.08); border-radius:12px; padding:32px 24px; box-sizing:border-box; }
  .auth-input { display:block !important; width:100% !important; box-sizing:border-box !important; font-size:16px !important; padding:14px !important; background:rgba(255,255,255,0.07) !important; border:1px solid rgba(255,255,255,0.12) !important; border-radius:6px !important; color:#ffffff !important; outline:none !important; margin-top:8px !important; font-family:inherit !important; box-shadow:none !important; }
  .auth-input:focus { border-color:rgba(244,185,66,0.5) !important; }
  .auth-input:-webkit-autofill,.auth-input:-webkit-autofill:hover,.auth-input:-webkit-autofill:focus { -webkit-box-shadow:0 0 0 30px #1a1f26 inset !important; -webkit-text-fill-color:#ffffff !important; }
  .auth-btn { display:block !important; width:100% !important; box-sizing:border-box !important; padding:15px !important; border:none !important; border-radius:6px !important; font-size:14px !important; font-weight:700 !important; letter-spacing:0.06em !important; text-transform:uppercase !important; font-family:inherit !important; }
  .auth-btn:not(:disabled) { background:#f4b942 !important; color:#0f1419 !important; cursor:pointer !important; }
  .auth-btn:disabled { background:rgba(244,185,66,0.3) !important; color:rgba(255,255,255,0.3) !important; cursor:not-allowed !important; }
  .auth-label { display:block; font-size:11px; letter-spacing:0.1em; text-transform:uppercase; color:rgba(255,255,255,0.4); }
  .auth-error { background:rgba(162,45,45,0.2); border:1px solid rgba(162,45,45,0.4); border-radius:6px; padding:12px 14px; margin-bottom:16px; text-align:center; font-size:13px; color:#f09595; }
`

const Logo = () => (
  <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'32px'}}>
    <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
    <span style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
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
    if (password.length < 8) { setError('Min. 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    router.replace('/auth/signin/?reset=success')
  }

  if (done) return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page" style={{textAlign:'center'}}>
        <Logo />
        <div style={{fontSize:'40px', marginBottom:'16px'}}>✉</div>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', maxWidth:'320px', marginBottom:'24px'}}>
          Reset link sent to <strong style={{color:'rgba(255,255,255,0.8)'}}>{email}</strong>. Expires in 1 hour.
        </p>
        <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
      </div>
    </>
  )

  if (mode === 'set') return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page">
        <Logo />
        <div className="auth-card">
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Set new password</h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>Choose a strong password</p>
          <div style={{marginBottom:'16px'}}>
            <label className="auth-label">New password</label>
            <input className="auth-input" type="password" value={password} placeholder="Min. 8 characters" onChange={e => setPassword(e.target.value)} />
          </div>
          <div style={{marginBottom:'24px'}}>
            <label className="auth-label">Confirm password</label>
            <input className="auth-input" type="password" value={confirm} placeholder="Repeat password" onChange={e => setConfirm(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleSet()} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" onClick={handleSet} disabled={!password||!confirm||loading}>
            {loading ? 'Saving...' : 'Set new password →'}
          </button>
        </div>
      </div>
    </>
  )

  return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page">
        <Logo />
        <div className="auth-card">
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Forgot password?</h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>Enter your email and we&apos;ll send a reset link</p>
          <div style={{marginBottom:'24px'}}>
            <label className="auth-label">Email address</label>
            <input className="auth-input" type="email" value={email} placeholder="you@email.com" autoComplete="email"
              onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key==='Enter'&&handleRequest()} />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-btn" onClick={handleRequest} disabled={!email||loading}>
            {loading ? 'Sending...' : 'Send reset link →'}
          </button>
        </div>
        <p style={{marginTop:'20px', fontSize:'13px'}}>
          <Link href="/auth/signin/" style={{color:'rgba(255,255,255,0.35)', textDecoration:'underline'}}>← Back to sign in</Link>
        </p>
      </div>
    </>
  )
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', background:'#0f1419'}} />}>
      <ResetContent />
    </Suspense>
  )
}
