'use client'
import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignInPage() {
  const router     = useRouter()
  const params     = useSearchParams()
  const supabase   = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const redirect = params.get('redirect') ?? '/'

  async function handleSignIn() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push(redirect)
    }
  }

  return (
    <div className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <Link href="/" className="text-xs tracking-widest text-muted block text-center mb-10">
          TRANSFER MARMARIS
        </Link>

        <h1 className="text-2xl font-medium mb-1 text-center">Sign in</h1>
        <p className="text-sm text-muted text-center mb-8">
          New here?{' '}
          <Link href="/auth/signup" className="text-paper underline">Create an account</Link>
        </p>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="px-4 py-3 text-sm"
              placeholder="you@email.com"
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="px-4 py-3 text-sm"
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleSignIn()}
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center">{error}</p>
          )}

          <button
            onClick={handleSignIn}
            disabled={loading || !email || !password}
            className="w-full bg-paper text-ink py-3 rounded-lg text-sm font-medium
                       hover:bg-paper/90 transition-colors mt-1
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </div>

        <p className="text-xs text-muted text-center mt-6">
          <Link href="/auth/reset" className="underline hover:text-paper">
            Forgot password?
          </Link>
        </p>
      </div>
    </div>
  )
}
