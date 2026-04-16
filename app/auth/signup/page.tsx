'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function SignUpPage() {
  const router   = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email:    form.email,
      password: form.password,
      options: {
        data: { full_name: form.fullName, role: 'customer' }
      }
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Update phone separately (not in auth metadata)
      const { data: { user } } = await supabase.auth.getUser()
      if (user && form.phone) {
        await supabase.from('users').update({ phone: form.phone, full_name: form.fullName }).eq('id', user.id)
      }
      router.push('/?welcome=1')
    }
  }

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: any) => setForm(p => ({ ...p, [key]: e.target.value }))
  })

  return (
    <div className="min-h-screen bg-ink text-paper flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <Link href="/" className="text-xs tracking-widest text-muted block text-center mb-10">
          TRANSFER MARMARIS
        </Link>

        <h1 className="text-2xl font-medium mb-1 text-center">Create account</h1>
        <p className="text-sm text-muted text-center mb-8">
          Already have one?{' '}
          <Link href="/auth/signin" className="text-paper underline">Sign in</Link>
        </p>

        <div className="flex flex-col gap-3">
          {[
            { label: 'Full name', key: 'fullName' as const, type: 'text',     placeholder: 'Tom Smith' },
            { label: 'Email',     key: 'email'    as const, type: 'email',    placeholder: 'you@email.com' },
            { label: 'Phone',     key: 'phone'    as const, type: 'tel',      placeholder: '+44 7700 900000' },
            { label: 'Password',  key: 'password' as const, type: 'password', placeholder: 'Min. 8 characters' },
          ].map(field => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">{field.label}</label>
              <input
                type={field.type}
                {...f(field.key)}
                className="px-4 py-3 text-sm"
                placeholder={field.placeholder}
              />
            </div>
          ))}

          {error && <p className="text-xs text-red-400 text-center">{error}</p>}

          <button
            onClick={handleSignUp}
            disabled={loading || !form.email || !form.password || !form.fullName}
            className="w-full bg-paper text-ink py-3 rounded-lg text-sm font-medium
                       hover:bg-paper/90 transition-colors mt-1
                       disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>

          <p className="text-xs text-muted text-center mt-1">
            By signing up you agree to our terms of service.
          </p>
        </div>
      </div>
    </div>
  )
}
