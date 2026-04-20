'use client'
import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

function SignInContent() {
  const router = useRouter()
  const params = useSearchParams()
  const supabase = createClient() as any
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const redirect = params.get('redirect') ?? '/'

  async function handleSignIn() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else router.push(decodeURIComponent(redirect))
  }

  const inputStyle = { width:'100%', fontSize:'16px', padding:'14px 12px', marginTop:'4px', borderRadius:'6px' }

  return (
    <div style={{minHeight:'100vh', backgroundColor:'#faf8f3', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{width:'100%', maxWidth:'380px'}}>
        <Link href="/" style={{fontSize:'11px', letterSpacing:'0.22em', color:'#0f1419', display:'block', textAlign:'center', marginBottom:'32px', textDecoration:'none', fontWeight:'500'}}>DALAMANAIR</Link>
        <h1 style={{fontSize:'28px', fontWeight:'500', color:'#0f1419', textAlign:'center', marginBottom:'8px'}}>Sign in</h1>
        <p style={{fontSize:'14px', color:'#8a8680', textAlign:'center', marginBottom:'28px'}}>
          New here? <Link href="/auth/signup" style={{color:'#0f1419', textDecoration:'underline'}}>Create an account</Link>
        </p>
        <div style={{backgroundColor:'#ffffff', border:'1px solid #e5e3dd', borderRadius:'12px', padding:'24px'}}>
          <div style={{marginBottom:'16px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#8a8680'}}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
              onKeyDown={e => e.key==='Enter' && handleSignIn()} style={inputStyle} />
          </div>
          <div style={{marginBottom:'20px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'#8a8680'}}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
              onKeyDown={e => e.key==='Enter' && handleSignIn()} style={inputStyle} />
          </div>
          {error && <p style={{fontSize:'13px', color:'#A32D2D', textAlign:'center', marginBottom:'12px'}}>{error}</p>}
          <button onClick={handleSignIn} disabled={loading||!email||!password} style={{
            width:'100%', backgroundColor:(loading||!email||!password)?'#fad98a':'#f4b942',
            color:'#0f1419', fontWeight:'600', fontSize:'14px', letterSpacing:'0.05em',
            textTransform:'uppercase', padding:'15px', borderRadius:'6px',
            border:'none', cursor:(loading||!email||!password)?'not-allowed':'pointer'
          }}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </div>
        <p style={{fontSize:'13px', color:'#8a8680', textAlign:'center', marginTop:'20px'}}>
          <Link href="/auth/reset" style={{color:'#8a8680', textDecoration:'underline'}}>Forgot password?</Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#faf8f3'}}/>}><SignInContent /></Suspense>
}
