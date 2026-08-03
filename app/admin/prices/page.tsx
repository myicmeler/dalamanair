'use client'
import { useState, useEffect, useCallback } from 'react'
import Script from 'next/script'
import { createClient } from '@/lib/supabase'

type ParsedRow = {
  rowNumber: number
  pickup: string
  dropoff: string
  priceEur: number | null
  priceGbp: number | null
  maxPax: number
  isActive: boolean
  pickupId: string | null
  dropoffId: string | null
  error: string | null
}

export default function AdminPrices() {
  const supabase = createClient() as any
  const [providers, setProviders] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [providerId, setProviderId] = useState('')
  const [rows, setRows] = useState<any[]>([])
  const [dirty, setDirty] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  // single-route form
  const [draft, setDraft] = useState({ pickup: '', dropoff: '', priceEur: '', priceGbp: '', maxPax: '4' })
  const [addError, setAddError] = useState('')

  // import
  const [preview, setPreview] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [xlsxReady, setXlsxReady] = useState(false)

  useEffect(() => {
    async function init() {
      const [{ data: provs, error: provErr }, { data: locs, error: locErr }] = await Promise.all([
        supabase.from('providers').select('id, company_name, is_approved').order('company_name'),
        supabase.from('locations').select('id, name').eq('is_active', true).order('name'),
      ])
      if (provErr) { setError(`Could not load providers: ${provErr.message}`); setLoading(false); return }
      if (locErr) { setError(`Could not load locations: ${locErr.message}`); setLoading(false); return }
      setProviders(provs ?? [])
      setLocations(locs ?? [])
      setLoading(false)
    }
    init()
  }, [])

  const loadPrices = useCallback(async (pid: string) => {
    if (!pid) { setRows([]); return }
    const { data, error: err } = await supabase
      .from('provider_route_prices')
      .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
      .eq('provider_id', pid)
      .order('created_at', { ascending: true })
    if (err) { setError(`Could not load prices: ${err.message}`); return }
    setRows(data ?? [])
    setDirty(new Set())
  }, [])

  useEffect(() => { loadPrices(providerId) }, [providerId, loadPrices])

  const providerName = providers.find(p => p.id === providerId)?.company_name ?? ''
  const locByName = (n: string) =>
    locations.find(l => l.name.trim().toLowerCase() === String(n ?? '').trim().toLowerCase())

  // ---------- single route ----------
  async function addRoute() {
    setAddError('')
    if (!providerId) { setAddError('Choose a provider first.'); return }
    if (!draft.pickup || !draft.dropoff) { setAddError('Choose a pick-up and drop-off.'); return }
    if (draft.pickup === draft.dropoff) { setAddError('Pick-up and drop-off must be different.'); return }
    const eur = draft.priceEur.trim() ? parseFloat(draft.priceEur) : null
    const gbp = draft.priceGbp.trim() ? parseFloat(draft.priceGbp) : null
    if (eur == null && gbp == null) { setAddError('Enter at least one price (€ or £).'); return }

    setBusy(true)
    const { error: err } = await supabase.from('provider_route_prices').upsert({
      provider_id: providerId,
      pickup_location_id: draft.pickup,
      dropoff_location_id: draft.dropoff,
      price_eur: eur,
      price_gbp: gbp,
      max_passengers: parseInt(draft.maxPax) || 4,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'provider_id,pickup_location_id,dropoff_location_id' })
    setBusy(false)
    if (err) { setAddError(err.message); return }
    setDraft({ pickup: '', dropoff: '', priceEur: '', priceGbp: '', maxPax: '4' })
    setNotice('Route saved.')
    await loadPrices(providerId)
  }

  // ---------- editable list ----------
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
    const { error: err } = await supabase.from('provider_route_prices').update({
      price_eur: eur,
      price_gbp: gbp,
      max_passengers: parseInt(r.max_passengers) || 4,
      is_active: !!r.is_active,
      updated_at: new Date().toISOString(),
    }).eq('id', id)
    setSavingId(null)
    if (err) { setError(err.message); return }
    setDirty(prev => { const n = new Set(prev); n.delete(id); return n })
  }

  async function deleteRow(id: string) {
    const r = rows.find(x => x.id === id)
    const label = r ? `${r.pickup?.name} → ${r.dropoff?.name}` : 'this route'
    if (!confirm(`Delete the price for ${label}?`)) return
    const { error: err } = await supabase.from('provider_route_prices').delete().eq('id', id)
    if (err) { setError(err.message); return }
    setRows(prev => prev.filter(x => x.id !== id))
  }

  // ---------- import ----------
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    setError(''); setNotice(''); setPreview(null)
    const file = e.target.files?.[0]
    if (!file) return
    if (!providerId) { setError('Choose a provider before importing.'); e.target.value = ''; return }

    const XLSX = (window as any).XLSX
    if (!XLSX) {
      setError('Spreadsheet reader is still loading — wait a moment and try again.')
      e.target.value = ''
      return
    }

    setFileName(file.name)
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf)
      const sheet = wb.Sheets['Prices'] ?? wb.Sheets[wb.SheetNames[0]]
      if (!sheet) { setError('No readable sheet found in that file.'); return }
      const raw: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' })

      const parsed: ParsedRow[] = raw.map((r, i) => {
        const pickup = String(r['Pick-up'] ?? '').trim()
        const dropoff = String(r['Drop-off'] ?? '').trim()
        const eurRaw = String(r['Price EUR'] ?? '').trim()
        const gbpRaw = String(r['Price GBP'] ?? '').trim()
        const paxRaw = String(r['Max passengers'] ?? '').trim()
        const actRaw = String(r['Active'] ?? 'yes').trim().toLowerCase()

        const priceEur = eurRaw === '' ? null : Number(eurRaw)
        const priceGbp = gbpRaw === '' ? null : Number(gbpRaw)
        const maxPax = paxRaw === '' ? 4 : parseInt(paxRaw)
        const pu = pickup ? locByName(pickup) : null
        const dl = dropoff ? locByName(dropoff) : null

        let err: string | null = null
        if (!pickup && !dropoff && priceEur == null && priceGbp == null) err = 'SKIP_EMPTY'
        else if (!pickup) err = 'Pick-up missing'
        else if (!dropoff) err = 'Drop-off missing'
        else if (!pu) err = `Unknown pick-up "${pickup}"`
        else if (!dl) err = `Unknown drop-off "${dropoff}"`
        else if (pu.id === dl.id) err = 'Pick-up and drop-off are the same'
        else if (priceEur == null && priceGbp == null) err = 'Needs at least one price'
        else if (priceEur != null && (isNaN(priceEur) || priceEur < 0)) err = 'Price EUR is not a valid number'
        else if (priceGbp != null && (isNaN(priceGbp) || priceGbp < 0)) err = 'Price GBP is not a valid number'
        else if (isNaN(maxPax) || maxPax < 1 || maxPax > 16) err = 'Max passengers must be 1-16'

        return {
          rowNumber: i + 2,
          pickup, dropoff, priceEur, priceGbp, maxPax,
          isActive: actRaw !== 'no' && actRaw !== 'false',
          pickupId: pu?.id ?? null,
          dropoffId: dl?.id ?? null,
          error: err,
        }
      }).filter(r => r.error !== 'SKIP_EMPTY')

      if (parsed.length === 0) { setError('No rows found. Check you used the Prices sheet.'); return }
      setPreview(parsed)
    } catch (err: any) {
      setError(`Could not read that file: ${err.message}`)
    } finally {
      e.target.value = ''
    }
  }

  async function confirmImport() {
    if (!preview) return
    const good = preview.filter(r => !r.error)
    if (good.length === 0) { setError('Nothing to import - every row has an error.'); return }
    setBusy(true); setError(''); setNotice('')
    const payload = good.map(r => ({
      provider_id: providerId,
      pickup_location_id: r.pickupId,
      dropoff_location_id: r.dropoffId,
      price_eur: r.priceEur,
      price_gbp: r.priceGbp,
      max_passengers: r.maxPax,
      is_active: r.isActive,
      updated_at: new Date().toISOString(),
    }))
    const { error: err } = await supabase.from('provider_route_prices')
      .upsert(payload, { onConflict: 'provider_id,pickup_location_id,dropoff_location_id' })
    setBusy(false)
    if (err) { setError(`Import failed: ${err.message}`); return }
    const skipped = preview.length - good.length
    setNotice(`Imported ${good.length} route${good.length === 1 ? '' : 's'} for ${providerName}.${skipped ? ` ${skipped} row${skipped === 1 ? '' : 's'} skipped.` : ''}`)
    setPreview(null); setFileName('')
    await loadPrices(providerId)
  }

  // ---------- styles ----------
  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px', marginBottom:'12px' }
  const inp: React.CSSProperties = { fontSize:'14px', padding:'10px', backgroundColor:'#1e2530', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#f0ede6', outline:'none', colorScheme:'dark' as any }
  const lbl: React.CSSProperties = { fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'5px' }
  const gold: React.CSSProperties = { padding:'10px 20px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:600, cursor:'pointer', letterSpacing:'0.05em', textTransform:'uppercase' }

  if (loading) return <div style={{padding:'60px', textAlign:'center', color:'rgba(255,255,255,0.3)'}}>Loading...</div>

  const validCount = preview ? preview.filter(r => !r.error).length : 0

  return (
    <div style={{padding:'20px 16px 80px', maxWidth:'900px', margin:'0 auto'}}>
      {/* SheetJS is loaded from CDN so the repo needs no new npm dependency. */}
      <Script
        src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"
        strategy="afterInteractive"
        onLoad={() => setXlsxReady(true)}
      />

      <h1 style={{fontSize:'20px', fontWeight:500, marginBottom:'4px'}}>Provider prices</h1>
      <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'16px'}}>
        Set default route prices on behalf of a provider. These generate instant auto-offers when a matching request arrives.
      </p>

      {error && <div style={{backgroundColor:'rgba(162,45,45,0.15)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'8px', padding:'12px', color:'#f09595', fontSize:'13px', marginBottom:'12px'}}>{error}</div>}
      {notice && <div style={{backgroundColor:'rgba(29,158,117,0.12)', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'8px', padding:'12px', color:'#1D9E75', fontSize:'13px', marginBottom:'12px'}}>{notice}</div>}

      {/* PROVIDER SELECTOR */}
      <div style={{...card, border:'1px solid rgba(244,185,66,0.25)'}}>
        <label style={lbl}>Provider</label>
        <select value={providerId} onChange={e => { setProviderId(e.target.value); setPreview(null); setNotice(''); setError('') }}
          style={{...inp, width:'100%', boxSizing:'border-box', fontSize:'15px'}}>
          <option value="">- Choose a provider -</option>
          {providers.map(p => (
            <option key={p.id} value={p.id}>{p.company_name}{p.is_approved ? '' : ' (not approved)'}</option>
          ))}
        </select>
      </div>

      {!providerId ? (
        <div style={{...card, textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.35)'}}>
          Choose a provider above to manage their prices.
        </div>
      ) : (
        <>
          {/* IMPORT */}
          <div style={card}>
            <p style={{fontSize:'10px', letterSpacing:'0.15em', color:'#f4b942', textTransform:'uppercase', marginBottom:'10px'}}>Import from Excel</p>
            <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'12px', lineHeight:1.6}}>
              Use the dalaman-prices-import-template.xlsx file. Rows are matched on route, so importing a route that already exists updates it rather than creating a duplicate.
            </p>
            <input type="file" accept=".xlsx,.xls" onChange={handleFile} disabled={!xlsxReady}
              style={{fontSize:'13px', color:'rgba(255,255,255,0.6)'}} />
            {!xlsxReady && <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'8px'}}>Loading spreadsheet reader...</p>}
            {fileName && <p style={{fontSize:'11px', color:'rgba(255,255,255,0.35)', marginTop:'8px'}}>{fileName}</p>}

            {preview && (
              <div style={{marginTop:'14px'}}>
                <p style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', marginBottom:'8px'}}>
                  {validCount} of {preview.length} rows ready to import
                </p>
                <div style={{maxHeight:'320px', overflow:'auto', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'6px'}}>
                  {preview.map(r => (
                    <div key={r.rowNumber} style={{display:'flex', alignItems:'center', gap:'10px', padding:'8px 12px', borderBottom:'1px solid rgba(255,255,255,0.05)', backgroundColor: r.error ? 'rgba(162,45,45,0.08)' : 'transparent'}}>
                      <span style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', width:'28px', flexShrink:0}}>{r.rowNumber}</span>
                      <span style={{fontSize:'12px', flex:1, minWidth:0, color: r.error ? 'rgba(255,255,255,0.45)' : '#ffffff'}}>
                        {r.pickup || '-'} &rarr; {r.dropoff || '-'}
                      </span>
                      {!r.error && (
                        <span style={{fontSize:'12px', color:'#f4b942', flexShrink:0}}>
                          {r.priceEur != null ? `€${r.priceEur}` : ''}{r.priceEur != null && r.priceGbp != null ? ' / ' : ''}{r.priceGbp != null ? `£${r.priceGbp}` : ''} · {r.maxPax} pax{r.isActive ? '' : ' · paused'}
                        </span>
                      )}
                      {r.error && <span style={{fontSize:'11px', color:'#f09595', flexShrink:0}}>{r.error}</span>}
                    </div>
                  ))}
                </div>
                <div style={{display:'flex', gap:'8px', marginTop:'12px'}}>
                  <button onClick={confirmImport} disabled={busy || validCount === 0} style={gold}>
                    {busy ? 'Importing...' : `Import ${validCount} route${validCount === 1 ? '' : 's'}`}
                  </button>
                  <button onClick={() => { setPreview(null); setFileName('') }}
                    style={{padding:'10px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer'}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ADD SINGLE ROUTE */}
          <div style={card}>
            <p style={{fontSize:'10px', letterSpacing:'0.15em', color:'#f4b942', textTransform:'uppercase', marginBottom:'12px'}}>Add a route</p>
            <div style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end'}}>
              <div style={{flex:'1', minWidth:'150px'}}>
                <label style={lbl}>Pick-up</label>
                <select value={draft.pickup} onChange={e => setDraft(d => ({ ...d, pickup: e.target.value }))} style={{...inp, width:'100%', boxSizing:'border-box'}}>
                  <option value="">-</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{flex:'1', minWidth:'150px'}}>
                <label style={lbl}>Drop-off</label>
                <select value={draft.dropoff} onChange={e => setDraft(d => ({ ...d, dropoff: e.target.value }))} style={{...inp, width:'100%', boxSizing:'border-box'}}>
                  <option value="">-</option>
                  {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div style={{width:'90px'}}>
                <label style={lbl}>€ price</label>
                <input type="number" placeholder="-" value={draft.priceEur} onChange={e => setDraft(d => ({ ...d, priceEur: e.target.value }))} style={{...inp, width:'100%', boxSizing:'border-box'}} />
              </div>
              <div style={{width:'90px'}}>
                <label style={lbl}>£ price</label>
                <input type="number" placeholder="-" value={draft.priceGbp} onChange={e => setDraft(d => ({ ...d, priceGbp: e.target.value }))} style={{...inp, width:'100%', boxSizing:'border-box'}} />
              </div>
              <div style={{width:'90px'}}>
                <label style={lbl}>Max pax</label>
                <input type="number" value={draft.maxPax} onChange={e => setDraft(d => ({ ...d, maxPax: e.target.value }))} style={{...inp, width:'100%', boxSizing:'border-box'}} />
              </div>
              <button onClick={addRoute} disabled={busy} style={{...gold, whiteSpace:'nowrap'}}>{busy ? 'Saving...' : 'Add'}</button>
            </div>
            {addError && <p style={{fontSize:'12px', color:'#f09595', marginTop:'10px'}}>{addError}</p>}
            <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'10px'}}>
              Prices are per directional trip. For instant return quotes, add the reverse route too.
            </p>
          </div>

          {/* EXISTING ROUTES */}
          {rows.length === 0 ? (
            <div style={{...card, textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>
              <p style={{fontSize:'14px', color:'rgba(255,255,255,0.5)'}}>No default prices yet for {providerName}</p>
              <p style={{fontSize:'12px'}}>Add routes above or import a spreadsheet.</p>
            </div>
          ) : (
            <>
              <p style={{fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.35)', margin:'18px 0 10px'}}>
                {rows.length} route{rows.length === 1 ? '' : 's'} for {providerName}
              </p>
              {rows.map(r => {
                const isDirty = dirty.has(r.id)
                return (
                  <div key={r.id} style={card}>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', flexWrap:'wrap', gap:'8px'}}>
                      <div style={{fontSize:'15px', fontWeight:500}}>{r.pickup?.name} &rarr; {r.dropoff?.name}</div>
                      <label style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'rgba(255,255,255,0.55)', cursor:'pointer'}}>
                        <input type="checkbox" checked={!!r.is_active} onChange={e => editRow(r.id, 'is_active', e.target.checked)} style={{accentColor:'#f4b942'}} />
                        {r.is_active ? 'Active' : 'Paused'}
                      </label>
                    </div>
                    <div style={{display:'flex', gap:'10px', flexWrap:'wrap', alignItems:'flex-end'}}>
                      <div style={{width:'100px'}}>
                        <label style={lbl}>€ price</label>
                        <input type="number" placeholder="-" value={r.price_eur ?? ''} onChange={e => editRow(r.id, 'price_eur', e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
                      </div>
                      <div style={{width:'100px'}}>
                        <label style={lbl}>£ price</label>
                        <input type="number" placeholder="-" value={r.price_gbp ?? ''} onChange={e => editRow(r.id, 'price_gbp', e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
                      </div>
                      <div style={{width:'90px'}}>
                        <label style={lbl}>Max pax</label>
                        <input type="number" value={r.max_passengers ?? 4} onChange={e => editRow(r.id, 'max_passengers', e.target.value)} style={{...inp, width:'100%', boxSizing:'border-box'}} />
                      </div>
                      <div style={{marginLeft:'auto', display:'flex', gap:'8px'}}>
                        <button onClick={() => saveRow(r.id)} disabled={!isDirty || savingId === r.id}
                          style={{padding:'10px 18px', backgroundColor: isDirty ? '#f4b942' : 'rgba(244,185,66,0.25)', color: isDirty ? '#0f1419' : 'rgba(255,255,255,0.35)', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:600, cursor: isDirty ? 'pointer' : 'not-allowed', letterSpacing:'0.05em', textTransform:'uppercase'}}>
                          {savingId === r.id ? 'Saving...' : 'Save'}
                        </button>
                        <button onClick={() => deleteRow(r.id)}
                          style={{padding:'10px 14px', background:'none', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'rgba(255,255,255,0.4)', fontSize:'12px', cursor:'pointer'}}>
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </>
      )}
    </div>
  )
}

