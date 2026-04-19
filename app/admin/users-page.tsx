'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const ROLES = ['customer', 'provider', 'driver', 'admin']

export default function AdminUsers() {
  const supabase = createClient() as any
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
      if (data) setUsers(data)
      setLoading(false)
    }
    load()
  }, [])

  async function updateRole(userId: string, role: string) {
    await supabase.from('users').update({ role }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u))
  }

  const filtered = users.filter((u: any) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (u.email || '').toLowerCase().includes(s) || (u.full_name || '').toLowerCase().includes(s)
    }
    return true
  })

  const roleBadge: Record<string, string> = {
    customer: 'bg-white/10 text-muted',
    provider: 'bg-blue/15 text-blue',
    driver: 'bg-teal/15 text-teal',
    admin: 'bg-red-900/30 text-red-400',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-6">Users</h1>

      <div className="flex gap-3 mb-6 items-center">
        <div className="flex gap-2">
          <button onClick={() => setRoleFilter('all')}
            className={`text-xs px-3 py-1.5 rounded border transition-all ${
              roleFilter === 'all' ? 'border-paper/35 text-paper' : 'border-border text-muted hover:text-paper'
            }`}>all</button>
          {ROLES.map(r => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`text-xs px-3 py-1.5 rounded border capitalize transition-all ${
                roleFilter === r ? 'border-paper/35 text-paper' : 'border-border text-muted hover:text-paper'
              }`}>{r}</button>
          ))}
        </div>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search email or name..." className="px-3 py-1.5 text-xs rounded flex-1 max-w-sm" />
        <span className="text-xs text-muted">{filtered.length} users</span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {['Name', 'Email', 'Phone', 'Language', 'Role', 'Joined'].map(h => (
                <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center text-muted text-sm py-10">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="text-center text-muted text-sm py-10">No users found</td></tr>
            ) : filtered.map((u: any) => (
              <tr key={u.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                <td className="px-4 py-3 text-sm">{u.full_name || '—'}</td>
                <td className="px-4 py-3 text-sm text-muted">{u.email}</td>
                <td className="px-4 py-3 text-sm text-muted">{u.phone || '—'}</td>
                <td className="px-4 py-3 text-xs text-muted uppercase">{u.preferred_language}</td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={e => updateRole(u.id, e.target.value)}
                    className={`text-xs px-2 py-1 rounded capitalize border-0 ${roleBadge[u.role] ?? 'bg-white/10'}`}>
                    {ROLES.map(r => <option key={r} value={r} className="capitalize bg-ink text-paper">{r}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-muted">
                  {new Date(u.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
