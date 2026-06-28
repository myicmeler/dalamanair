'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderPrices() {
  const supabase = createClient() as any
  const [providerId, setProviderId] = useState('')
  const [locations, setLocations] = useState<any[]>([])
  const [rows, setRows] = useState<any[]>([])
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [draft, setDraft] = useState({ pickup: '', dropoff: '', priceEur: '', priceGbp: '', maxPax: '4' })

  const load = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError('Not signed in'); setLoading(false); return }

      const { data: provider, error: provErr } = await supabase
        .from('providers').select('id').eq('user_id', user.id).single()
      if (provErr || !provider) {
        setError('Provider account not found. Make sure your account is approved.')
        setLoading(false); return
      }
      setProviderId(provider.id)

      const { data: locs } = await supabase
        .from('locations').select('id, name').eq('is_active', true).order('name')
      if (locs) setLocations(locs)

      const { data: prices, error: priceErr } = await supabase
        .from('provider_route_prices')
        .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: true })
      if (priceErr) { setError(`Could not load prices: ${priceErr.message}`); setLoading(false); return }
      setRows(prices ?? [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const locName = (id: string) => locations.find(l => l.id === id)?.name ?? '—'

  function editRow(id: string, field: string, value: any) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r))
    setDirty(prev => new Set(prev).add(id))
  }

  async function saveRow(id: string) {
    const r = rows.find(x => x.id === id)
    if (!r) return
    const eur = r.price_eur === '' || r.price_eur == null ? null : parseFloat(r.price_eur)
    const gbp = r.price_gbp === '' || r.price_gbp == null ? null : parseFloat(r.price_gbp)
    if (eur == null && gbp == null) { setError('Each route needs at least one price (€ or £).'); return }
    setError('')
    setSavingId(id)
    try {
      const { error } = await supabase.from('provider_route_prices').update({
        price_eur: eur,
        price_gbp: gbp,
        max_passengers: parseInt(r.max_passengers) || 4,
        is_active: !!r.is_active,
        updated_at: new Date().toISOString(),
      }).eq('id', id)
      if (error) throw error
      setDirty(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch (err: any) {
      setError(err.message)
    }
    setSavingId(null)
  }

  async function deleteRow(id: string) {
    const r = rows.find(x => x.id === id)
    const label = r ? `${r.pickup?.name ?? locName(r.pickup_location_id)} → ${r.dropoff?.name ?? locName(r.dropoff_location_id)}` : 'this route'
    if (!confirm(`Delete the price for ${label}?`)) return
    try {
      const { error } = await supabase.from('provider_route_prices').delete().eq('id', id)
      if (error) throw error
      setRows(prev => prev.filter(x => x.id !== id))
    } catch (err: any) {
      setError(err.message)
    }
  }

  async function addRoute() {
    setAddError('')
    if (!draft.pickup || !draft.dropoff) { setAddError('Choose a pick-up and drop-off.'); return }
    if (draft.pickup === draft.dropoff) { setAddError('Pick-up and drop-off must be different.'); return }
    const eur = draft.priceEur.trim() ? parseFloat(draft.priceEur) : null
    const gbp = draft.priceGbp.trim() ? parseFloat(draft.priceGbp) : null
    if (eur == null && gbp == null) { setAddError('Enter at least one price (€ or £).'); return }

    setAdding(true)
    try {
      const { data, error } = await supabase.from('provider_route_prices').insert({
        provider_id: providerId,
        pickup_location_id: draft.pickup,
        dropoff_location_id: draft.dropoff,
        price_eur: eur,
        price_gbp: gbp,
        max_passengers: parseInt(draft.maxPax) || 4,
        is_active: true,
      }).select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)').single()
      if (error) {
        if (error.code === '23505') setAddError('You already have a price for this route — edit it below.')
        else setAddError(error.message)
        setAdding(false); return
      }
      setRows(prev => [...prev, data])
      setDraft({ pickup: '', dropoff: '', priceEur: '', priceGbp: '', maxPax: '4' })
    } catch (err: any) {
      setAddError(err.message)
    }
    setAdding(false)
  }

  const card: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px', marginBottom: '10px' }
  const inp: React.CSSProperties = { fontSize: '14px', padding: '10px', backgroundColor: '#1e2530', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#f0ede6', outline: 'none', colorScheme: 'dark' as any }
  const lbl: React.CSSProperties = { fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: '5px' }

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: 500, marginBottom: '4px' }}>Default prices</h1>
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
        Set your standard price for a route and we'll submit it automatically the instant a matching request comes in — even while you sleep. Leave a currency blank to skip it.
      </p>

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>}

      {!loading && error && (
        <div style={{ backgroundColor: 'rgba(162,45,45,0.15)', border: '1px solid rgba(162,45,45,0.3)', borderRadius: '8px', padding: '14px', color: '#f09595', fontSize: '13px', marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          {/* ADD A ROUTE */}
          <div style={{ ...card, border: '1px solid rgba(244,185,66,0.2)' }}>
            <p style={{ fontSize: '10px', letterSpacing: '0.15em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '12px' }}>Add a route</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={lbl}>Pick-up</label>
                <select value={draft.pickup} onChange={e => setDraft(d => ({ ...d, pickup: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}>
                  <option value="">—</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ flex: '1', minWidth: '150px' }}>
                <label style={lbl}>Drop-off</label>
                <select value={draft.dropoff} onChange={e => setDraft(d => ({ ...d, dropoff: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }}>
                  <option value="">—</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{ width: '90px' }}>
                <label style={lbl}>€ price</label>
                <input type="number" placeholder="—" value={draft.priceEur} onChange={e => setDraft(d => ({ ...d, priceEur: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ width: '90px' }}>
                <label style={lbl}>£ price</label>
                <input type="number" placeholder="—" value={draft.priceGbp} onChange={e => setDraft(d => ({ ...d, priceGbp: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ width: '90px' }}>
                <label style={lbl}>Max pax</label>
                <input type="number" value={draft.maxPax} onChange={e => setDraft(d => ({ ...d, maxPax: e.target.value }))} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
              </div>
              <button onClick={addRoute} disabled={adding}
                style={{ padding: '10px 20px', backgroundColor: '#f4b942', color: '#0f1419', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: adding ? 'not-allowed' : 'pointer', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
            {addError && <p style={{ fontSize: '12px', color: '#f09595', marginTop: '10px' }}>{addError}</p>}
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', marginTop: '10px' }}>
              Prices are per directional trip. For instant return quotes, add the reverse route too — we add the two legs together.
            </p>
          </div>

          {/* EXISTING ROUTES */}
          {rows.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.3)' }}>
              <div style={{ fontSize: '30px', marginBottom: '10px' }}>💷</div>
              <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>No default prices yet</p>
              <p style={{ fontSize: '12px' }}>Add your most popular routes above to start auto-quoting.</p>
            </div>
          ) : rows.map(r => {
            const isDirty = dirty.has(r.id)
            return (
              <div key={r.id} style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: 500 }}>
                    {(r.pickup?.name ?? locName(r.pickup_location_id))} → {(r.dropoff?.name ?? locName(r.dropoff_location_id))}
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'rgba(255,255,255,0.55)', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!r.is_active} onChange={e => editRow(r.id, 'is_active', e.target.checked)} style={{ accentColor: '#f4b942' }} />
                    {r.is_active ? 'Active' : 'Paused'}
                  </label>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ width: '100px' }}>
                    <label style={lbl}>€ price</label>
                    <input type="number" placeholder="—" value={r.price_eur ?? ''} onChange={e => editRow(r.id, 'price_eur', e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ width: '100px' }}>
                    <label style={lbl}>£ price</label>
                    <input type="number" placeholder="—" value={r.price_gbp ?? ''} onChange={e => editRow(r.id, 'price_gbp', e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ width: '90px' }}>
                    <label style={lbl}>Max pax</label>
                    <input type="number" value={r.max_passengers ?? 4} onChange={e => editRow(r.id, 'max_passengers', e.target.value)} style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
                    <button onClick={() => saveRow(r.id)} disabled={!isDirty || savingId === r.id}
                      style={{ padding: '10px 18px', backgroundColor: isDirty ? '#f4b942' : 'rgba(244,185,66,0.25)', color: isDirty ? '#0f1419' : 'rgba(255,255,255,0.35)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: isDirty ? 'pointer' : 'not-allowed', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {savingId === r.id ? 'Saving...' : 'Save'}
                    </button>
                    <button onClick={() => deleteRow(r.id)}
                      style={{ padding: '10px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: 'rgba(255,255,255,0.4)', fontSize: '12px', cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}
