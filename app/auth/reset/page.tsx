'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

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
    // If Supabase redirected here with a session (from password reset email link)
    // the hash contains access_token — Supabase JS picks it up automatically
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('set')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest() {
    if (!email) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
  }

  async function handleSetPassword() {
    if (!password || password !== confirm) {
      setError('Passwords do not match')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    router.push('/auth/signin?reset=success')
  }

  const inputStyle = {
    width: '100%', fontSize: '16px', padding: '14px 12px',
    marginTop: '4px', borderRadius: '6px',
    border: '1px solid #e5e3dd', backgroundColor: '#faf8f3',
    color: '#0f1419', outline: 'none',
  }

  // ── Set new password (arrived from email link) ──────────
  if (mode === 'set') return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'380px'}}>
        <Link href="/" style={{fontSize:'11px', letterSpacing:'0.22em', color:'#0f1419', display:'block', textAlign:'center', marginBottom:'32px', textDecoration:'none', fontWeight:'500'}}>
          DALAMANAIR
        </Link>
        <h1 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419', textAlign:'center', marginBottom:'8px'}}>Set new password</h1>
        <p style={{fontSize:'14px', color:'#8a8680', textAlign:'center', marginBottom:'28px'}}>Choose a strong password for your account.</p>
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'12px', padding:'24px'}}>
          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'#8a8680'}}>New password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Min. 8 characters" style={inputStyle} />
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'#8a8680'}}>Confirm password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              placeholder="Repeat password" style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleSetPassword()} />
          </div>
          {error && <p style={{fontSize:'13px', color:'#A32D2D', textAlign:'center', marginBottom:'12px'}}>{error}</p>}
          <button onClick={handleSetPassword} disabled={loading || !password || !confirm} style={{
            width:'100%', backgroundColor:(!loading&&password&&confirm)?'#f4b942':'#fad98a',
            color:'#0f1419', fontWeight:'600', fontSize:'14px', letterSpacing:'0.05em',
            textTransform:'uppercase' as const, padding:'15px', borderRadius:'6px',
            border:'none', cursor:(!loading&&password&&confirm)?'pointer':'not-allowed',
          }}>
            {loading ? 'Saving...' : 'Set new password →'}
          </button>
        </div>
      </div>
    </div>
  )

  // ── Success — email sent ─────────────────────────────────
  if (done) return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'380px', textAlign:'center'}}>
        <Link href="/" style={{fontSize:'11px', letterSpacing:'0.22em', color:'#0f1419', display:'block', marginBottom:'32px', textDecoration:'none', fontWeight:'500'}}>
          DALAMANAIR
        </Link>
        <div style={{width:'56px', height:'56px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px'}}>
          ✉
        </div>
        <h1 style={{fontSize:'24px', fontWeight:'500', color:'#0f1419', marginBottom:'10px'}}>Check your email</h1>
        <p style={{fontSize:'14px', color:'#5a574f', marginBottom:'8px', lineHeight:'1.6'}}>
          We sent a password reset link to <strong>{email}</strong>.
        </p>
        <p style={{fontSize:'13px', color:'#8a8680', marginBottom:'24px'}}>
          Click the link in the email to set your new password. It expires in 1 hour.
        </p>
        <Link href="/auth/signin" style={{fontSize:'13px', color:'#8a8680', textDecoration:'underline'}}>
          ← Back to sign in
        </Link>
      </div>
    </div>
  )

  // ── Request reset ────────────────────────────────────────
  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'380px'}}>
        <Link href="/" style={{fontSize:'11px', letterSpacing:'0.22em', color:'#0f1419', display:'block', textAlign:'center', marginBottom:'32px', textDecoration:'none', fontWeight:'500'}}>
          DALAMANAIR
        </Link>
        <h1 style={{fontSize:'26px', fontWeight:'500', color:'#0f1419', textAlign:'center', marginBottom:'8px'}}>Forgot password?</h1>
        <p style={{fontSize:'14px', color:'#8a8680', textAlign:'center', marginBottom:'28px'}}>
          Enter your email and we will send you a reset link.
        </p>
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'12px', padding:'24px'}}>
          <div style={{marginBottom:'20px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'#8a8680'}}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && handleRequest()} />
          </div>
          {error && <p style={{fontSize:'13px', color:'#A32D2D', textAlign:'center', marginBottom:'12px'}}>{error}</p>}
          <button onClick={handleRequest} disabled={loading || !email} style={{
            width:'100%', backgroundColor:(!loading&&email)?'#f4b942':'#fad98a',
            color:'#0f1419', fontWeight:'600', fontSize:'14px', letterSpacing:'0.05em',
            textTransform:'uppercase' as const, padding:'15px', borderRadius:'6px',
            border:'none', cursor:(!loading&&email)?'pointer':'not-allowed',
          }}>
            {loading ? 'Sending...' : 'Send reset link →'}
          </button>
        </div>
        <p style={{fontSize:'13px', color:'#8a8680', textAlign:'center', marginTop:'20px'}}>
          <Link href="/auth/signin" style={{color:'#8a8680', textDecoration:'underline'}}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}} />}>
      <ResetContent />
    </Suspense>
  )
}
