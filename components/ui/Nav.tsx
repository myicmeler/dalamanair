'use client'
import Link from 'next/link'
import { useState } from 'react'

const labels = {
  en: { bookings: 'My bookings', help: 'Help', signin: 'Sign in', signup: 'Sign up' },
  tr: { bookings: 'Rezervasyonlarım', help: 'Yardım', signin: 'Giriş yap', signup: 'Kayıt ol' },
}

export default function Nav({ lang, onLangChange }: {
  lang: 'en' | 'tr'
  onLangChange?: (l: 'en' | 'tr') => void
}) {
  const t = labels[lang]
  return (
    <nav className="flex items-center justify-between px-10 py-5 border-b border-border">
      <Link href="/" className="text-sm font-medium tracking-widest text-paper opacity-90">
        TRANSFER MARMARIS
      </Link>
      <div className="flex items-center gap-8">
        <Link href="/bookings" className="text-sm text-muted hover:text-paper transition-colors">
          {t.bookings}
        </Link>
        <Link href="/help" className="text-sm text-muted hover:text-paper transition-colors">
          {t.help}
        </Link>
        {onLangChange && (
          <div className="flex gap-0.5 bg-white/5 rounded p-0.5">
            {(['en','tr'] as const).map(l => (
              <button
                key={l}
                onClick={() => onLangChange(l)}
                className={`text-xs px-2.5 py-1 rounded transition-all ${
                  lang === l
                    ? 'bg-white/10 text-paper'
                    : 'text-muted hover:text-paper'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        )}
        <Link
          href="/auth/signin"
          className="text-sm text-muted hover:text-paper transition-colors"
        >
          {t.signin}
        </Link>
        <Link
          href="/auth/signup"
          className="text-sm border border-white/20 text-paper px-4 py-2 rounded hover:bg-white/5 transition-colors"
        >
          {t.signup}
        </Link>
      </div>
    </nav>
  )
}
