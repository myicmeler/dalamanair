'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignUpPage() {
  const router = useRouter()
  const supabase = createClient() as any
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSignUp() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName },
        emailRedirectTo: `${window.location.origin}/`
      }
    })
    if (error) { setError(error.message); setLoading(false); return }

    if (data.session) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && form.phone) {
        await supabase.from('users').update({ phone: form.phone, full_name: form.fullName }).eq('id', user.id)
      }
      router.push('/?welcome=1')
    } else {
      setSuccess(true)
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <Link href="/" className="text-[11px] tracking-[0.22em] text-ink block mb-10 font-medium">DALAMANAIR</Link>
          <div className="w-14 h-14 rounded-full bg-accent/20 text-accent-2 flex items-center justify-center text-2xl mx-auto mb-6">✓</div>
          <h1 className="text-2xl font-medium text-ink mb-3">Check your email</h1>
          <p className="text-[13px] text-sub mb-6">We&apos;ve sent a confirmation link to <span className="text-ink">{form.email}</span>. Click it to activate your account and sign in.</p>
          <Link href="/auth/signin" className="text-[13px] text-muted hover:text-ink underline">← Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" className="text-[11px] tracking-[0.22em] text-ink block text-center mb-10 font-medium">DALAMANAIR</Link>
        <h1 className="text-3xl font-medium text-ink mb-2 text-center">Create account</h1>
        <p className="text-[13px] text-muted text-center mb-8">
          Already have one?{' '}
          <Link href="/auth/signin" className="text-ink underline">Sign in</Link>
        </p>
        <div className="bg-white border border-line rounded-md p-6 flex flex-col gap-3">
          {[
            { label: 'Full name', key: 'fullName' as const, type: 'text', placeholder: 'Tom Henriksen' },
            { label: 'Email', key: 'email' as const, type: 'email', placeholder: 'you@email.com' },
            { label: 'Phone', key: 'phone' as const, type: 'tel', placeholder: '+44 7700...' },
            { label: 'Password', key: 'password' as const, type: 'password', placeholder: '••••••••' },
          ].map(f => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <label className="text-[10px] tracking-[0.1em] uppercase text-muted">{f.label}</label>
              <input type={f.type} value={form[f.key]} placeholder={f.placeholder}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
            </div>
          ))}
          {error && <p className="text-[12px] text-red-600 text-center">{error}</p>}
          <button onClick={handleSignUp}
            disabled={loading || !form.email || !form.password || !form.fullName}
            className="w-full bg-accent hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed text-ink font-medium text-[12px] tracking-[0.08em] uppercase py-3 rounded transition-colors mt-2">
            {loading ? 'Creating...' : 'Create account →'}
          </button>
        </div>
        <p className="text-[11px] text-muted text-center mt-6 leading-relaxed">
          By signing up you agree to our Terms & Privacy policy.
        </p>
      </div>
    </div>
  )
}
