'use client'
import { useState, useEffect, Suspense } from 'react'
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) router.replace(decodeURIComponent(redirect))
    })
  }, [])

  async function handleSignIn() {
    if (!email || !password || loading) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Just redirect — nav handles role display, no extra DB call needed
    router.replace(decodeURIComponent(redirect))
    router.refresh()
  }

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

  const canSubmit = email && password && !loading

  return (
    <div style={page}>
      <Link href="/" style={{fontSize:'13px', fontWeight:'700', letterSpacing:'0.2em', color:'#ffffff', textDecoration:'none', marginBottom:'40px', display:'block'}}>
        dalaman.me
      </Link>

      <div style={card}>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>
          Sign in
        </h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 28px'}}>
          New here?{' '}
          <Link href="/auth/signup/" style={{color:'#f4b942', textDecoration:'none', fontWeight:'500'}}>
            Create an account
          </Link>
        </p>

        <div style={{marginBottom:'16px'}}>
          <label style={lbl}>Email</label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            placeholder="you@email.com"
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={inp}
          />
        </div>

        <div style={{marginBottom:'24px'}}>
          <label style={lbl}>Password</label>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            placeholder="••••••••"
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={inp}
          />
        </div>

        {error && (
          <div style={{background:'rgba(162,45,45,0.2)', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'6px', padding:'12px 14px', marginBottom:'16px'}}>
            <p style={{fontSize:'13px', color:'#f09595', margin:0, textAlign:'center'}}>{error}</p>
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={!canSubmit}
          style={{
            display: 'block',
            width: '100%',
            boxSizing: 'border-box',
            padding: '15px',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '700',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            background: canSubmit ? '#f4b942' : 'rgba(244,185,66,0.3)',
            color: canSubmit ? '#0f1419' : 'rgba(255,255,255,0.3)',
          }}
        >
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>
      </div>

      <p style={{marginTop:'20px', fontSize:'13px'}}>
        <Link href="/auth/reset/" style={{color:'rgba(255,255,255,0.35)', textDecoration:'underline'}}>
          Forgot password?
        </Link>
      </p>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', background:'#0f1419'}} />}>
      <SignInContent />
    </Suspense>
  )
}
