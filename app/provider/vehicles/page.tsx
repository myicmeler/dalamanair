'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ProviderLayout from '../layout'

const VEHICLE_TYPES = ['sedan', 'minivan', 'minibus', 'luxury', 'suv']

export default function ProviderVehicles() {
  const supabase = createClient() as any
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [providerId, setProviderId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    type: 'sedan', make: '', model: '', year: '', plate_number: '',
    seats: '', luggage_capacity: '', features: [] as string[]
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
      if (!provider) return
      setProviderId(provider.id)
      const { data: vh } = await supabase.from('vehicles').select('*').eq('provider_id', provider.id).order('type')
      if (vh) setVehicles(vh)
      setLoading(false)
    }
    load()
  }, [])

  function toggleFeature(f: string) {
    setForm(prev => ({
      ...prev,
      features: prev.features.includes(f) ? prev.features.filter(x => x !== f) : [...prev.features, f]
    }))
  }

  async function addVehicle() {
    if (!form.make || !form.model || !form.seats) return
    setSaving(true)
    const { data } = await supabase.from('vehicles').insert({
      provider_id: providerId,
      type: form.type,
      make: form.make,
      model: form.model,
      year: form.year ? parseInt(form.year) : null,
      plate_number: form.plate_number || null,
      seats: parseInt(form.seats),
      luggage_capacity: parseInt(form.luggage_capacity) || 0,
      features: form.features,
      is_active: true,
    }).select().single()
    if (data) setVehicles(prev => [...prev, data])
    setForm({ type: 'sedan', make: '', model: '', year: '', plate_number: '', seats: '', luggage_capacity: '', features: [] })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(vehicleId: string, current: boolean) {
    await supabase.from('vehicles').update({ is_active: !current }).eq('id', vehicleId)
    setVehicles(prev => prev.map(v => v.id === vehicleId ? { ...v, is_active: !current } : v))
  }

  return (
    <ProviderLayout>
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-medium">Fleet</h1>
          <button onClick={() => setShowAdd(!showAdd)}
            className="text-sm bg-paper text-ink px-4 py-2 rounded hover:bg-paper/90 transition-colors">
            + Add vehicle
          </button>
        </div>

        {showAdd && (
          <div className="bg-white/[0.03] border border-border rounded-lg p-5 mb-6">
            <h2 className="text-sm font-medium mb-4">New vehicle</h2>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-muted">Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} className="px-3 py-2.5 text-sm capitalize">
                  {VEHICLE_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
                </select>
              </div>
              {[
                { label: 'Make *', key: 'make', placeholder: 'Mercedes' },
                { label: 'Model *', key: 'model', placeholder: 'Vito' },
                { label: 'Year', key: 'year', placeholder: '2023' },
                { label: 'Plate number', key: 'plate_number', placeholder: '48 MT 001' },
                { label: 'Seats *', key: 'seats', placeholder: '7' },
                { label: 'Luggage capacity', key: 'luggage_capacity', placeholder: '6' },
              ].map(f => (
                <div key={f.key} className="flex flex-col gap-1.5">
                  <label className="text-xs text-muted">{f.label}</label>
                  <input value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                    className="px-3 py-2.5 text-sm" placeholder={f.placeholder} />
                </div>
              ))}
            </div>
            <div className="mb-4">
              <div className="text-xs text-muted mb-2">Features</div>
              <div className="flex gap-2 flex-wrap">
                {['ac', 'wifi', 'child_seat'].map(f => (
                  <button key={f} onClick={() => toggleFeature(f)}
                    className={`text-xs px-3 py-1.5 rounded border transition-all capitalize ${
                      form.features.includes(f) ? 'border-paper/50 text-paper bg-white/5' : 'border-border text-muted'
                    }`}>{f.replace('_', ' ')}</button>
                ))}
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={addVehicle} disabled={saving || !form.make || !form.model || !form.seats}
                className="text-sm bg-paper text-ink px-4 py-2 rounded disabled:opacity-30">
                {saving ? 'Saving...' : 'Save vehicle'}
              </button>
              <button onClick={() => setShowAdd(false)} className="text-sm text-muted hover:text-paper">Cancel</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {loading ? (
            <div className="text-muted text-sm col-span-3 py-10 text-center">Loading...</div>
          ) : vehicles.length === 0 ? (
            <div className="text-muted text-sm col-span-3 py-10 text-center">No vehicles yet — add your first vehicle above</div>
          ) : vehicles.map((v: any) => (
            <div key={v.id} className="bg-white/[0.03] border border-border rounded-lg p-4">
              <div className="text-xs tracking-widest text-muted uppercase mb-1 capitalize">{v.type}</div>
              <div className="text-base font-medium mb-1">{v.make} {v.model}</div>
              {v.year && <div className="text-xs text-muted mb-1">{v.year}</div>}
              <div className="text-xs text-muted mb-1">{v.seats} passengers · {v.luggage_capacity} bags</div>
              {v.plate_number && <div className="text-xs text-muted mb-3">{v.plate_number}</div>}
              {v.features?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-3">
                  {v.features.map((f: string) => (
                    <span key={f} className="text-xs bg-white/5 px-2 py-0.5 rounded capitalize">{f.replace('_', ' ')}</span>
                  ))}
                </div>
              )}
              <div className="flex justify-between items-center pt-3 border-t border-border">
                <span className={`text-xs px-2 py-0.5 rounded ${v.is_active ? 'bg-teal/15 text-teal' : 'bg-white/10 text-muted'}`}>
                  {v.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => toggleActive(v.id, v.is_active)} className="text-xs text-muted hover:text-paper transition-colors">
                  {v.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ProviderLayout>
  )
}
