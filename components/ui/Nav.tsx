'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

const labels = {
  en: { transfers: 'Transfers', how: 'How it works', help: 'Help', signin: 'Sign in', signup: 'Sign up', signout: 'Sign out', dashboard: 'Dashboard', admin: 'Admin' },
  tr: { transfers: 'Transferler', how: 'Nasıl çalışır', help: 'Yardım', signin: 'Giriş', signup: 'Kayıt ol', signout: 'Çıkış', dashboard: 'Panel', admin: 'Yönetim' },
}

export default function Nav({ lang = 'en', onLangChange, variant = 'light' }: {
  lang?: 'en' | 'tr'
  onLangChange?: (l: 'en' | 'tr') => void
  variant?: 'light' | 'overlay'
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
        const { data: profile } = await supabase.from('users').select('role, full_name').eq('id', user.id).single()
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
        setUser(null); setRole('')
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    setUser(null); setRole('')
    router.push('/'); router.refresh()
  }

  const isOverlay = variant === 'overlay'
  const textColor = isOverlay ? 'text-white/80' : 'text-sub'
  const hoverColor = isOverlay ? 'hover:text-white' : 'hover:text-ink'
  const bgColor = isOverlay ? 'bg-ink/92 backdrop-blur-sm' : 'bg-white border-b border-line'

  return (
    <nav className={`flex items-center justify-between px-8 py-4 ${bgColor} relative z-30`}>
      <Link href="/" className={`text-xs font-medium tracking-[0.22em] ${isOverlay ? 'text-white' : 'text-ink'}`}>
        DALAMANAIR
      </Link>
      <div className="flex items-center gap-7">
        <Link href="/" className={`text-[13px] ${textColor} ${hoverColor} transition-colors`}>{t.transfers}</Link>
        <Link href="/how-it-works" className={`text-[13px] ${textColor} ${hoverColor} transition-colors`}>{t.how}</Link>
        <Link href="/help" className={`text-[13px] ${textColor} ${hoverColor} transition-colors`}>{t.help}</Link>
        {onLangChange && (
          <div className="flex gap-1 text-[11px] tracking-widest">
            {(['en','tr'] as const).map(l => (
              <button key={l} onClick={() => onLangChange(l)}
                className={`transition-colors ${lang === l ? (isOverlay ? 'text-white' : 'text-ink') : (isOverlay ? 'text-white/40 hover:text-white/70' : 'text-muted hover:text-sub')}`}>
                {l.toUpperCase()}
              </button>
            )).reduce((a, b, i) => i === 0 ? [b] : [...a, <span key={`s${i}`} className={isOverlay ? 'text-white/30' : 'text-line'}>·</span>, b], [] as any[])}
          </div>
        )}
        {user ? (
          <>
            {role === 'provider' && <Link href="/provider" className={`text-[13px] ${textColor} ${hoverColor}`}>{t.dashboard}</Link>}
            {role === 'admin' && <Link href="/admin" className={`text-[13px] ${textColor} ${hoverColor}`}>{t.admin}</Link>}
            <button onClick={handleSignOut} className={`text-[13px] ${textColor} ${hoverColor}`}>{t.signout}</button>
          </>
        ) : (
          <>
            <Link href="/auth/signin" className={`text-[13px] ${textColor} ${hoverColor}`}>{t.signin}</Link>
            <Link href="/auth/signup" className="text-[11px] font-medium tracking-wider uppercase bg-accent hover:bg-accent-2 text-ink px-4 py-2 rounded transition-colors">
              {t.signup}
            </Link>
          </>
        )}
      </div>
    </nav>
  )
}
