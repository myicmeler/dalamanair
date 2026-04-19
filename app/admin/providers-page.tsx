'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminProviders() {
  const supabase = createClient() as any
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'pending'|'approved'>('all')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('providers')
        .select('*, user:users(email, full_name)')
        .order('created_at', { ascending: false })
      if (data) setProviders(data)
      setLoading(false)
    }
    load()
  }, [])

  async function approve(providerId: string) {
    await supabase.from('providers').update({ is_approved: true }).eq('id', providerId)
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, is_approved: true } : p))
  }

  async function unapprove(providerId: string) {
    await supabase.from('providers').update({ is_approved: false }).eq('id', providerId)
    setProviders(prev => prev.map(p => p.id === providerId ? { ...p, is_approved: false } : p))
  }

  const filtered = providers.filter((p: any) => {
    if (filter === 'pending') return !p.is_approved
    if (filter === 'approved') return p.is_approved
    return true
  })

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Providers</h1>
      </div>

      <div className="flex gap-2 mb-6">
        {(['all','pending','approved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded border capitalize transition-all ${
              filter === f ? 'border-paper/35 text-paper' : 'border-border text-muted hover:text-paper'
            }`}>{f}</button>
        ))}
        <span className="text-xs text-muted self-center ml-2">{filtered.length} providers</span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {['Company', 'Contact', 'Rating', 'Commission', 'Type', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-muted text-sm py-10">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} className="text-center text-muted text-sm py-10">No providers found</td></tr>
            ) : filtered.map((p: any) => (
              <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium">{p.company_name}</div>
                  {p.phone && <div className="text-xs text-muted">{p.phone}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm">{p.user?.full_name ?? p.contact_name ?? '—'}</div>
                  <div className="text-xs text-muted">{p.user?.email ?? '—'}</div>
                </td>
                <td className="px-4 py-3 text-sm">{(p.avg_rating || 0).toFixed(1)}★ <span className="text-xs text-muted">({p.total_reviews || 0})</span></td>
                <td className="px-4 py-3 text-sm">{p.commission_pct || 0}%</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-muted">
                    {p.is_subcontractor ? 'Subcontractor' : 'Provider'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${p.is_approved ? 'bg-teal/15 text-teal' : 'bg-amber/15 text-amber'}`}>
                    {p.is_approved ? 'Approved' : 'Pending'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {p.is_approved ? (
                    <button onClick={() => unapprove(p.id)} className="text-xs text-muted hover:text-paper transition-colors">Unapprove</button>
                  ) : (
                    <button onClick={() => approve(p.id)} className="text-xs bg-paper text-ink px-3 py-1.5 rounded hover:bg-paper/90 transition-colors">Approve</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
