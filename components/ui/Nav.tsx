'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const labels = {
  en: { bookings: 'My bookings', help: 'Help', signin: 'Sign in', signup: 'Sign up', signout: 'Sign out', provider: 'Dashboard' },
  tr: { bookings: 'Rezervasyonlarım', help: 'Yardım', signin: 'Giriş yap', signup: 'Kayıt ol', signout: 'Çıkış yap', provider: 'Panel' },
}

export default function Nav({ lang, onLangChange }: {
  lang: 'en' | 'tr'
  onLangChange?: (l: 'en' | 'tr') => void
}) {
  const t = labels[lang]
  const router = useRouter()
  const supabase = createClient() as any
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string>('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profile } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', user.id)
          .single()
        if (profile) setRole(profile.role)
      }
    }
    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_: any, session: any) => {
      if (session?.user) {
        setUser(session.user)
        supabase.from('users').select('role, full_name').eq('id', session.user.id).single()
          .then(({ data }: any) => { if (data) setRole(data.role) })
      } else {
        setUser(null)
        setRole('')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null)
    setRole('')
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="flex items-center justify-between px-10 py-5 border-b border-border">
      <Link href="/" className="text-sm font-medium tracking-widest text-paper opacity-90">
        TRANSFER MARMARIS
      </Link>
      <div className="flex items-center gap-8">
        {onLangChange && (
          <div className="flex gap-0.5 bg-white/5 rounded p-0.5">
            {(['en','tr'] as const).map(l => (
              <button key={l} onClick={() => onLangChange(l)}
                className={`text-xs px-2.5 py-1 rounded transition-all ${lang === l ? 'bg-white/10 text-paper' : 'text-muted hover:text-paper'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        {user ? (
          <>
            {role === 'provider' && (
              <Link href="/provider" className="text-sm text-muted hover:text-paper transition-colors">
                {t.provider}
              </Link>
            )}
            {role === 'admin' && (
              <Link href="/admin" className="text-sm text-muted hover:text-paper transition-colors">
                Admin
              </Link>
            )}
            <span className="text-xs text-muted">{user.email}</span>
            <button onClick={handleSignOut}
              className="text-sm border border-white/20 text-paper px-4 py-2 rounded hover:bg-white/5 transition-colors">
              {t.signout}
            </button>
          </>
        ) : (
          <>
            <Link href="/auth/signin" className="text-sm text-muted hover:text-paper transition-colors">
              {t.signin}
            </Link>
            <Link href="/auth/signup"
              className="text-sm border border-white/20 text-paper px-4 py-2 rounded hover:bg-white/5 transition-colors">
              {t.signup}
            </Link>
