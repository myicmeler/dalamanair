'use client'
import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase'

const S = {
  page: { minHeight:'100vh', background:'#0f1419', display:'flex' as const, flexDirection:'column' as const, alignItems:'center' as const, justifyContent:'center' as const, padding:'24px 16px', boxSizing:'border-box' as const },
  card: { width:'100%', maxWidth:'400px', background:'#1a1f26', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'12px', padding:'32px 24px', boxSizing:'border-box' as const },
  label: { display:'block' as const, fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', marginBottom:'6px' },
  input: { display:'block' as const, width:'100%', boxSizing:'border-box' as const, fontSize:'16px', padding:'14px 12px', background:'#2a2f36', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#ffffff', outline:'none', fontFamily:'inherit' },
}

function SignInContent() {
  const params = useSearchParams()
  const supabase = createClient() as any
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const redirect = params.get('redirect') ?? '/'

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) window.location.href = decodeURIComponent(redirect)
    })
  }, [])

  async function handleSignIn() {
    const emailVal = emailRef.current?.value ?? ''
    const passwordVal = passwordRef.current?.value ?? ''
    if (!emailVal || !passwordVal || loading) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({
      email: emailVal,
      password: passwordVal,
    })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    // Force full page reload so Nav re-reads the session
    window.location.href = decodeURIComponent(redirect)
  }

  return (
    <div style={S.page}>
      <Link href="/" style={{display:'flex', flexDirection:'column', alignItems:'center', gap:'8px', textDecoration:'none', marginBottom:'32px'}}>
        <Image src="/logo.jpg" alt="dalaman.me" width={64} height={64} style={{borderRadius:'50%', objectFit:'cover'}} />
        <span style={{fontSize:'12px', fontWeight:700, letterSpacing:'0.2em', color:'#ffffff'}}>dalaman.me</span>
      </Link>

      <div style={S.card}>
        <h1 style={{fontSize:'22px', fontWeight:500, color:'#ffffff', textAlign:'center', margin:'0 0 6px'}}>Sign in</h1>
        <p style={{fontSize:'14px', color:'rgba(255,255,255,0.4)', textAlign:'center', margin:'0 0 24px'}}>
          New here?{' '}
          <Link href="/auth/signup/" style={{color:'#f4b942', textDecoration:'none', fontWeight:500}}>Create an account</Link>
        </p>

        <div style={{marginBottom:'16px'}}>
          <label style={S.label}>Email</label>
          <input
            ref={emailRef}
            type="email"
            autoComplete="email"
            placeholder="you@email.com"
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={S.input}
          />
        </div>

        <div style={{marginBottom:'24px'}}>
          <label style={S.label}>Password</label>
          <input
            ref={passwordRef}
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            style={S.input}
          />
        </div>

        {error && (
          <div style={{background:'rgba(162,45,45,0.3)', border:'1px solid #A32D2D', borderRadius:'6px', padding:'12px', marginBottom:'16px', textAlign:'center', fontSize:'13px', color:'#f09595'}}>
            {error}
          </div>
        )}

        <button
          onClick={handleSignIn}
          disabled={loading}
          style={{
            display:'block', width:'100%', boxSizing:'border-box' as const,
            padding:'15px', border:'none', borderRadius:'6px',
            fontSize:'14px', fontWeight:700, letterSpacing:'0.06em',
            textTransform:'uppercase' as const, fontFamily:'inherit',
            background: loading ? '#b8892e' : '#f4b942',
            color:'#0f1419', cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Signing in...' : 'Sign in →'}
        </button>
      </div>

      <p style={{marginTop:'20px', fontSize:'13px'}}>
        <Link href="/auth/reset/" style={{color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>Forgot password?</Link>
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
