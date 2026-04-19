'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const labels = {
  en: {
    main: 'Main', dashboard: 'Dashboard', bookings: 'Bookings',
    drivers: 'Drivers', fleet: 'Fleet', vehicles: 'Vehicles',
    subcontractors: 'Subcontractors', account: 'Account',
    reviews: 'Reviews', settings: 'Settings',
    notifications: 'notifications', signout: 'Sign out',
  },
  tr: {
    main: 'Ana menü', dashboard: 'Gösterge paneli', bookings: 'Rezervasyonlar',
    drivers: 'Sürücüler', fleet: 'Filo', vehicles: 'Araçlar',
    subcontractors: 'Taşeronlar', account: 'Hesap',
    reviews: 'Değerlendirmeler', settings: 'Ayarlar',
    notifications: 'bildirim', signout: 'Çıkış yap',
  }
}

export default function ProviderLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [providerName, setProviderName] = useState('Provider')
  const [initials, setInitials] = useState('P')
  const t = labels[lang]

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth/signin?redirect=/provider'); return }
      const { data: provider } = await supabase
        .from('providers')
        .select('company_name')
        .eq('user_id', user.id)
        .single()
      if (provider) {
        setProviderName(provider.company_name)
        setInitials(provider.company_name.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase())
      }
    }
    load()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { href: '/provider', label: t.dashboard, section: t.main },
    { href: '/provider/bookings', label: t.bookings },
    { href: '/provider/drivers', label: t.drivers },
    { href: '/provider/vehicles', label: t.vehicles, section: t.fleet },
    { href: '/provider/subcontractors', label: t.subcontractors },
    { href: '/provider/reviews', label: t.reviews, section: t.account },
    { href: '/provider/settings', label: t.settings },
  ]

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 border-b border-border flex-shrink-0">
        <div className="text-sm font-medium tracking-wide">{providerName}</div>
        <div className="flex items-center gap-5">
          <div className="flex gap-0.5 bg-white/5 rounded p-0.5">
            {(['en','tr'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)}
                className={`text-xs px-2.5 py-1 rounded transition-all ${lang===l ? 'bg-white/10 text-paper' : 'text-muted hover:text-paper'}`}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <span className="text-xs text-muted cursor-pointer hover:text-paper" onClick={handleSignOut}>{t.signout}</span>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">{initials}</div>
        </div>
      </div>

      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-52 border-r border-border flex-shrink-0 py-6">
          {navItems.map((item, i) => (
            <div key={item.href}>
              {item.section && (
                <div className="text-xs tracking-widest text-muted/50 uppercase px-6 pt-5 pb-2">{item.section}</div>
              )}
              <Link href={item.href}
                className="block px-6 py-2.5 text-sm text-muted hover:text-paper transition-colors">
                {item.label}
              </Link>
            </div>
          ))}
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
