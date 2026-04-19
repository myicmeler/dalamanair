'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ProviderLayout from './layout'

export default function ProviderDrivers() {
  const supabase = createClient() as any
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [providerId, setProviderId] = useState('')
  const [form, setForm] = useState({ full_name: '', phone: '', licence_number: '', preferred_language: 'tr' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
      if (!provider) return
      setProviderId(provider.id)
      const { data: dr } = await supabase.from('drivers').select('*').eq('provider_id', provider.id).order('full_name')
      if (dr) setDrivers(dr)
      setLoading(false)
    }
    load()
  }, [])

  async function addDriver() {
    if (!form.full_name || !form.phone) return
    setSaving(true)
    const { data } = await supabase.from('drivers').insert({
      ...form, provider_id: providerId, is_active: true, status: 'available'
    }).select().single()
    if (data) setDrivers(prev => [...prev, data])
    setForm({ full_name: '', phone: '', licence_number: '', preferred_language: 'tr' })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(driverId: string, current: boolean) {
    await supabase.from('drivers').update({ is_active: !current }).eq('id', driverId)
    setDrivers(prev => prev.map(d => d.id === driverId ? { ...d, is_active: !current } : d))
  }

  const statusColor: Record<string, string> = {
    available: 'bg-teal', on_trip: 'bg-amber', off_duty: 'bg-white/20'
  }

  return (
    <ProviderLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-medium">Drivers</h1>
          <button onClick={() => setShowAdd(!showAdd)}
            className="text-sm bg-paper text-ink px-4 py-2 rounded hover:bg-paper/90 transition-colors">
            + Add driver
          </button>
        </div>

        {showAdd && (
          <div className="bg-white/[0.03] border border-border rounded-lg p-5 mb-6">
            <h2 className="text-sm font-medium mb-4">New driver</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { label: 'Full name *', key: 'full_name', placeholder: 'Ahmet Yılmaz' },
                { label: 'Phone *', key: 'phone', placeholder: '+90 532 000 0000' },
                { label: 'Licence number', key: 'licence_number', placeholder: 'Optional' },
              ].map(f => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                    className="px-3 py-2.5 text-sm" placeholder={f.placeholder} />
                </div>
              ))}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">Preferred language</label>
                <select value={form.preferred_language} onChange={e => setForm(prev => ({ ...prev, preferred_language: e.target.value }))}
                  className="px-3 py-2.5 text-sm">
                  <option value="tr">Turkish</option>
                  <option value="en">English</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={addDriver} disabled={saving || !form.full_name || !form.phone}
                className="text-sm bg-paper text-ink px-4 py-2 rounded disabled:opacity-30">
                {saving ? 'Saving...' : 'Save driver'}
              </button>
              <button onClick={() => setShowAdd(false)} className="text-sm text-muted hover:text-paper">Cancel</button>
            </div>
          </div>
        )}

        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-white/[0.02]">
                {['Driver', 'Phone', 'Licence', 'Language', 'Status', 'Active', ''].map(h => (
                  <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center text-muted text-sm py-10">Loading...</td></tr>
              ) : drivers.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-muted text-sm py-10">No drivers yet — add your first driver above</td></tr>
              ) : drivers.map((d: any) => (
                <tr key={d.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                  <td className="px-4 py-3 text-sm font-medium">{d.full_name}</td>
                  <td className="px-4 py-3 text-sm text-muted">{d.phone}</td>
                  <td className="px-4 py-3 text-sm text-muted">{d.licence_number || '—'}</td>
                  <td className="px-4 py-3 text-xs text-muted uppercase">{d.preferred_language}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${statusColor[d.status] ?? 'bg-white/20'}`} />
                      <span className="text-xs text-muted capitalize">{d.status?.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded ${d.is_active ? 'bg-teal/15 text-teal' : 'bg-white/10 text-muted'}`}>
                      {d.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleActive(d.id, d.is_active)}
                      className="text-xs text-muted hover:text-paper transition-colors">
                      {d.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProviderLayout>
  )
}
