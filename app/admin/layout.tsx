'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const supabase = createClient() as any
  const [userEmail, setUserEmail] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/signin?redirect=/admin')
        return
      }
      const { data: profile } = await supabase
        .from('users')
        .select('role, email')
        .eq('id', user.id)
        .single()
      if (!profile || profile.role !== 'admin') {
        router.push('/')
        return
      }
      setUserEmail(profile.email)
      setLoading(false)
    }
    check()
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/')
  }

  const navItems = [
    { href: '/admin', label: 'Overview', section: 'Main' },
    { href: '/admin/bookings', label: 'All bookings' },
    { href: '/admin/providers', label: 'Providers', section: 'Management' },
    { href: '/admin/reviews', label: 'Reviews' },
    { href: '/admin/locations', label: 'Locations', section: 'Platform' },
    { href: '/admin/users', label: 'Users' },
  ]

  if (loading) {
    return <div className="min-h-screen bg-ink text-muted flex items-center justify-center text-sm">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-ink text-paper flex flex-col">
      <div className="flex items-center justify-between px-8 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium tracking-widest">ADMIN</div>
          <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded">Platform control</span>
        </div>
        <div className="flex items-center gap-5">
          <span className="text-xs text-muted">{userEmail}</span>
          <button onClick={handleSignOut} className="text-xs text-muted hover:text-paper transition-colors">Sign out</button>
          <Link href="/" className="text-xs text-muted hover:text-paper transition-colors">← Back to site</Link>
        </div>
      </div>

      <div className="flex flex-1">
        <div className="w-52 border-r border-border flex-shrink-0 py-6">
          {navItems.map((item) => (
            <div key={item.href}>
              {item.section && (
                <div className="text-xs tracking-widest text-muted/50 uppercase px-6 pt-5 pb-2">{item.section}</div>
              )}
              <Link href={item.href} className="block px-6 py-2.5 text-sm text-muted hover:text-paper transition-colors">
                {item.label}
              </Link>
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
