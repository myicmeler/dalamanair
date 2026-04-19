'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const LOCATION_TYPES = ['airport', 'hotel', 'area', 'port']

export default function AdminLocations() {
  const supabase = createClient() as any
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', name_tr: '', type: 'area', address: '', lat: '', lng: '', iata_code: '', sort_order: '0'
  })

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('locations').select('*').order('sort_order').order('name')
      if (data) setLocations(data)
      setLoading(false)
    }
    load()
  }, [])

  async function addLocation() {
    if (!form.name) return
    setSaving(true)
    const { data } = await supabase.from('locations').insert({
      name: form.name,
      name_tr: form.name_tr || null,
      type: form.type,
      address: form.address || null,
      lat: form.lat ? parseFloat(form.lat) : null,
      lng: form.lng ? parseFloat(form.lng) : null,
      iata_code: form.iata_code || null,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: true,
    }).select().single()
    if (data) setLocations(prev => [...prev, data].sort((a, b) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name)))
    setForm({ name: '', name_tr: '', type: 'area', address: '', lat: '', lng: '', iata_code: '', sort_order: '0' })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('locations').update({ is_active: !current }).eq('id', id)
    setLocations(prev => prev.map(l => l.id === id ? { ...l, is_active: !current } : l))
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-medium">Locations</h1>
        <button onClick={() => setShowAdd(!showAdd)}
          className="text-sm bg-paper text-ink px-4 py-2 rounded hover:bg-paper/90 transition-colors">
          + Add location
        </button>
      </div>

      {showAdd && (
        <div className="bg-white/[0.03] border border-border rounded-lg p-5 mb-6">
          <h2 className="text-sm font-medium mb-4">New location</h2>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted">Type</label>
              <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="px-3 py-2.5 text-sm capitalize">
                {LOCATION_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
              </select>
            </div>
            {[
              { label: 'Name (EN) *', key: 'name', placeholder: 'Içmeler' },
              { label: 'Name (TR)', key: 'name_tr', placeholder: 'İçmeler' },
              { label: 'Address', key: 'address', placeholder: 'Optional' },
              { label: 'Latitude', key: 'lat', placeholder: '36.6112' },
              { label: 'Longitude', key: 'lng', placeholder: '28.2469' },
              { label: 'IATA code', key: 'iata_code', placeholder: 'DLM (airports only)' },
              { label: 'Sort order', key: 'sort_order', placeholder: '0' },
            ].map(f => (
              <div key={f.key} className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="px-3 py-2.5 text-sm" placeholder={f.placeholder} />
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={addLocation} disabled={saving || !form.name}
              className="text-sm bg-paper text-ink px-4 py-2 rounded disabled:opacity-30">
              {saving ? 'Saving...' : 'Save location'}
            </button>
            <button onClick={() => setShowAdd(false)} className="text-sm text-muted hover:text-paper">Cancel</button>
          </div>
        </div>
      )}

      <div className="border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-white/[0.02]">
              {['Name', 'Name (TR)', 'Type', 'IATA', 'Order', 'Status', ''].map(h => (
                <th key={h} className="text-left text-xs tracking-widest text-muted uppercase px-4 py-3 font-normal">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="text-center text-muted text-sm py-10">Loading...</td></tr>
            ) : locations.map((l: any) => (
              <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-white/[0.01]">
                <td className="px-4 py-3 text-sm font-medium">{l.name}</td>
                <td className="px-4 py-3 text-sm text-muted">{l.name_tr || '—'}</td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-white/5 text-muted capitalize">{l.type}</span>
                </td>
                <td className="px-4 py-3 text-sm text-muted">{l.iata_code || '—'}</td>
                <td className="px-4 py-3 text-sm text-muted">{l.sort_order}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${l.is_active ? 'bg-teal/15 text-teal' : 'bg-white/10 text-muted'}`}>
                    {l.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => toggleActive(l.id, l.is_active)} className="text-xs text-muted hover:text-paper transition-colors">
                    {l.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
