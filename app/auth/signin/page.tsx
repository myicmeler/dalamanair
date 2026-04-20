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
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(decodeURIComponent(redirect))
    }
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[11px] tracking-[0.22em] text-ink block text-center mb-10 font-medium">
          DALAMANAIR
        </Link>
        <h1 className="text-3xl font-medium text-ink mb-2 text-center">Sign in</h1>
        <p className="text-[13px] text-muted text-center mb-8">
          New here?{' '}
          <Link href="/auth/signup" className="text-ink underline">Create an account</Link>
        </p>
        <div className="bg-white border border-line rounded-md p-6 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[0.1em] uppercase text-muted">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@email.com" onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] tracking-[0.1em] uppercase text-muted">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handleSignIn()} />
          </div>
          {error && <p className="text-[12px] text-red-600 text-center">{error}</p>}
          <button onClick={handleSignIn} disabled={loading || !email || !password}
            className="w-full bg-accent hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed text-ink font-medium text-[12px] tracking-[0.08em] uppercase py-3 rounded transition-colors mt-2">
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        </div>
        <p className="text-[12px] text-muted text-center mt-6">
          <Link href="/auth/reset" className="underline hover:text-ink">Forgot password?</Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return <Suspense fallback={<div className="min-h-screen bg-paper"/>}><SignInContent /></Suspense>
}
