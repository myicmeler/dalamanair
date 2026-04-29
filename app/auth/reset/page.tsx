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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') setMode('set')
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleRequest() {
    if (!email) return
    setLoading(true); setError('')
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset/`,
    })
    if (error) { setError(error.message); setLoading(false); return }
    setDone(true); setLoading(false)
  }

  async function handleSetPassword() {
    if (!password || password !== confirm) { setError('Passwords do not match'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true); setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setError(error.message); setLoading(false); return }
    setLoading(false)
    router.push('/auth/signin/?reset=success')
  }

  const inputStyle = {
    width:'100%', fontSize:'15px', padding:'13px 14px',
    backgroundColor:'rgba(255,255,255,0.06)',
    border:'1px solid rgba(255,255,255,0.12)',
    borderRadius:'6px', color:'#ffffff',
    outline:'none', boxSizing:'border-box' as const, marginTop:'6px',
  }
  const labelStyle = {
    fontSize:'10px', letterSpacing:'0.12em', textTransform:'uppercase' as const,
    color:'rgba(255,255,255,0.4)', display:'block',
  }

  if (mode === 'set') return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'400px'}}>
        <div style={{textAlign:'center', marginBottom:'36px'}}>
          <Link href="/" style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.22em', color:'#ffffff', textDecoration:'none'}}>DALAMAN.ME</Link>
        </div>
        <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px'}}>
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', marginBottom:'8px'}}>Set new password</h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.45)', textAlign:'center', marginBottom:'24px'}}>Choose a strong password for your account.</p>
          <div style={{display:'flex', flexDirection:'column', gap:'16px'}}>
            <div>
              <label style={labelStyle}>New password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Min. 8 characters" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Confirm password</label>
              <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repeat password" style={inputStyle} onKeyDown={e => e.key==='Enter'&&handleSetPassword()} />
            </div>
          </div>
          {error && <div style={{backgroundColor:'rgba(162,45,45,0.15)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'6px', padding:'10px 14px', marginTop:'16px'}}><p style={{fontSize:'13px', color:'#f09595', margin:'0', textAlign:'center'}}>{error}</p></div>}
          <button onClick={handleSetPassword} disabled={loading||!password||!confirm} style={{width:'100%', padding:'14px', marginTop:'20px', backgroundColor:(!loading&&password&&confirm)?'#f4b942':'rgba(244,185,66,0.3)', color:(!loading&&password&&confirm)?'#0f1419':'rgba(255,255,255,0.3)', fontWeight:'600', fontSize:'13px', letterSpacing:'0.06em', textTransform:'uppercase', borderRadius:'6px', border:'none', cursor:(!loading&&password&&confirm)?'pointer':'not-allowed'}}>
            {loading ? 'Saving...' : 'Set new password →'}
          </button>
        </div>
      </div>
    </div>
  )

  if (done) return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'400px', textAlign:'center'}}>
        <Link href="/" style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.22em', color:'#ffffff', textDecoration:'none', display:'block', marginBottom:'36px'}}>DALAMAN.ME</Link>
        <div style={{width:'60px', height:'60px', borderRadius:'50%', backgroundColor:'rgba(244,185,66,0.15)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', fontSize:'24px'}}>✉</div>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'10px'}}>Check your email</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)', lineHeight:'1.7', marginBottom:'8px'}}>We sent a reset link to <strong style={{color:'rgba(255,255,255,0.8)'}}>{email}</strong></p>
        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.35)', marginBottom:'28px'}}>Click the link to set your new password. It expires in 1 hour.</p>
        <Link href="/auth/signin/" style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
      </div>
    </div>
  )

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#0f1419', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'400px'}}>
        <div style={{textAlign:'center', marginBottom:'36px'}}>
          <Link href="/" style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.22em', color:'#ffffff', textDecoration:'none'}}>DALAMAN.ME</Link>
        </div>
        <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px'}}>
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', marginBottom:'8px'}}>Forgot password?</h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.45)', textAlign:'center', marginBottom:'24px'}}>Enter your email and we'll send you a reset link.</p>
          <div>
            <label style={labelStyle}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" style={inputStyle} onKeyDown={e => e.key==='Enter'&&handleRequest()} />
          </div>
          {error && <div style={{backgroundColor:'rgba(162,45,45,0.15)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'6px', padding:'10px 14px', marginTop:'16px'}}><p style={{fontSize:'13px', color:'#f09595', margin:'0', textAlign:'center'}}>{error}</p></div>}
          <button onClick={handleRequest} disabled={loading||!email} style={{width:'100%', padding:'14px', marginTop:'20px', backgroundColor:(!loading&&email)?'#f4b942':'rgba(244,185,66,0.3)', color:(!loading&&email)?'#0f1419':'rgba(255,255,255,0.3)', fontWeight:'600', fontSize:'13px', letterSpacing:'0.06em', textTransform:'uppercase', borderRadius:'6px', border:'none', cursor:(!loading&&email)?'pointer':'not-allowed'}}>
            {loading ? 'Sending...' : 'Send reset link →'}
          </button>
        </div>
        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:'20px'}}>
          <Link href="/auth/signin/" style={{color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>← Back to sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function ResetPage() {
  return <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#0f1419'}} />}><ResetContent /></Suspense>
}
