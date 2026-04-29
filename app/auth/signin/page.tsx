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

  // Check if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (session) router.push(decodeURIComponent(redirect))
    })
  }, [])

  async function handleSignIn() {
    if (!email || !password) return
    setLoading(true); setError('')
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      // Get user role and redirect accordingly
      const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).single()
      const role = profile?.role
      if (decodeURIComponent(redirect) !== '/') {
        router.push(decodeURIComponent(redirect))
      } else if (role === 'admin') {
        router.push('/admin/')
      } else if (role === 'provider') {
        router.push('/provider/')
      } else if (role === 'driver') {
        router.push('/driver/')
      } else {
        router.push('/')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight:'100vh', backgroundColor:'#0f1419',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'20px',
    }}>
      <div style={{width:'100%', maxWidth:'400px'}}>
        {/* Logo */}
        <div style={{textAlign:'center', marginBottom:'36px'}}>
          <Link href="/" style={{
            fontSize:'12px', fontWeight:'700', letterSpacing:'0.22em',
            color:'#ffffff', textDecoration:'none', display:'inline-block'
          }}>DALAMAN.ME</Link>
        </div>

        {/* Card */}
        <div style={{
          backgroundColor:'#1a1f26',
          border:'1px solid rgba(255,255,255,0.08)',
          borderRadius:'12px', padding:'32px',
        }}>
          <h1 style={{
            fontSize:'22px', fontWeight:'500', color:'#ffffff',
            marginBottom:'6px', textAlign:'center'
          }}>Sign in</h1>
          <p style={{fontSize:'14px', color:'rgba(255,255,255,0.45)', textAlign:'center', marginBottom:'28px'}}>
            New here?{' '}
            <Link href="/auth/signup/" style={{color:'#f4b942', textDecoration:'none', fontWeight:'500'}}>
              Create an account
            </Link>
          </p>

          <div style={{marginBottom:'16px'}}>
            <label style={{
              fontSize:'10px', letterSpacing:'0.12em', textTransform:'uppercase',
              color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px'
            }}>Email</label>
            <input
              type="email" value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              placeholder="you@email.com"
              style={{
                width:'100%', fontSize:'15px', padding:'13px 14px',
                backgroundColor:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:'6px', color:'#ffffff',
                outline:'none', boxSizing:'border-box',
              }}
            />
          </div>

          <div style={{marginBottom:'20px'}}>
            <label style={{
              fontSize:'10px', letterSpacing:'0.12em', textTransform:'uppercase',
              color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'6px'
            }}>Password</label>
            <input
              type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
              placeholder="••••••••"
              style={{
                width:'100%', fontSize:'15px', padding:'13px 14px',
                backgroundColor:'rgba(255,255,255,0.06)',
                border:'1px solid rgba(255,255,255,0.12)',
                borderRadius:'6px', color:'#ffffff',
                outline:'none', boxSizing:'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              backgroundColor:'rgba(162,45,45,0.15)',
              border:'1px solid rgba(162,45,45,0.3)',
              borderRadius:'6px', padding:'10px 14px',
              marginBottom:'16px',
            }}>
              <p style={{fontSize:'13px', color:'#f09595', margin:'0', textAlign:'center'}}>{error}</p>
            </div>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading || !email || !password}
            style={{
              width:'100%', padding:'14px',
              backgroundColor: (!loading && email && password) ? '#f4b942' : 'rgba(244,185,66,0.3)',
              color: (!loading && email && password) ? '#0f1419' : 'rgba(255,255,255,0.3)',
              fontWeight:'600', fontSize:'13px',
              letterSpacing:'0.06em', textTransform:'uppercase',
              borderRadius:'6px', border:'none',
              cursor: (!loading && email && password) ? 'pointer' : 'not-allowed',
              transition:'background 0.2s',
            }}
          >
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </div>

        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.3)', textAlign:'center', marginTop:'20px'}}>
          <Link href="/auth/reset/" style={{color:'rgba(255,255,255,0.4)', textDecoration:'underline'}}>
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{minHeight:'100vh', backgroundColor:'#0f1419'}} />}>
      <SignInContent />
    </Suspense>
  )
}
