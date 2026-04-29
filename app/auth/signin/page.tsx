'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
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
    router.replace(decodeURIComponent(redirect))
    router.refresh()
  }

  return (
    <>
      <style>{`
        .auth-page {
          min-height: 100vh;
          background: #0f1419 !important;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          box-sizing: border-box;
        }
        .auth-card {
          width: 100%;
          max-width: 400px;
          background: #1a1f26;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 32px 24px;
          box-sizing: border-box;
        }
        .auth-input {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          font-size: 16px !important;
          padding: 14px !important;
          background: rgba(255,255,255,0.07) !important;
          border: 1px solid rgba(255,255,255,0.12) !important;
          border-radius: 6px !important;
          color: #ffffff !important;
          outline: none !important;
          margin-top: 8px !important;
          font-family: inherit !important;
          box-shadow: none !important;
        }
        .auth-input:focus {
          border-color: rgba(244,185,66,0.5) !important;
          box-shadow: 0 0 0 2px rgba(244,185,66,0.1) !important;
        }
        .auth-input:-webkit-autofill,
        .auth-input:-webkit-autofill:hover,
        .auth-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 30px #1a1f26 inset !important;
          -webkit-text-fill-color: #ffffff !important;
          caret-color: #ffffff !important;
        }
        .auth-btn {
          display: block !important;
          width: 100% !important;
          box-sizing: border-box !important;
          padding: 15px !important;
          border: none !important;
          border-radius: 6px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          letter-spacing: 0.06em !important;
          text-transform: uppercase !important;
          font-family: inherit !important;
        }
        .auth-btn:not(:disabled) {
          background: #f4b942 !important;
          color: #0f1419 !important;
          cursor: pointer !important;
        }
        .auth-btn:disabled {
          background: rgba(244,185,66,0.3) !important;
          color: rgba(255,255,255,0.3) !important;
          cursor: not-allowed !important;
        }
        .auth-label {
          display: block;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.4);
        }
        .auth-error {
          background: rgba(162,45,45,0.2);
          border: 1px solid rgba(162,45,45,0.4);
          border-radius: 6px;
          padding: 12px 14px;
          margin-bottom: 16px;
          text-align: center;
          font-size: 13px;
          color: #f09595;
        }
      `}</style>

      <div className="auth-page">
        <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'32px'}}>
          <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
          <span style={{fontSize:'12px', fontWeight:'700', letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
        </Link>

        <div className="auth-card">
          <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>
            Sign in
          </h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>
            New here?{' '}
            <Link href="/auth/signup/" style={{color:'#f4b942', textDecoration:'none', fontWeight:'500'}}>
              Create an account
            </Link>
          </p>

          <div style={{marginBottom:'16px'}}>
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              type="email"
              autoComplete="email"
              value={email}
              placeholder="you@email.com"
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            />
          </div>

          <div style={{marginBottom:'24px'}}>
            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              type="password"
              autoComplete="current-password"
              value={password}
              placeholder="••••••••"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button
            className="auth-btn"
            onClick={handleSignIn}
            disabled={!email || !password || loading}
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
    </>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', background:'#0f1419'}} />}>
      <SignInContent />
    </Suspense>
  )
}
