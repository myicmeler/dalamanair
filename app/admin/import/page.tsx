'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type ImportType = 'providers' | 'users' | 'drivers' | 'vehicles'

const TEMPLATES: Record<ImportType, { headers: string[], example: string[], notes: string }> = {
  providers: {
    headers: ['company_name', 'contact_name', 'email', 'phone', 'description', 'commission_pct', 'is_approved'],
    example: ['Marmaris Transfer Co.', 'Ahmet Yilmaz', 'ahmet@marmaris.com', '+90 532 100 0001', 'Premium transfers', '15', 'true'],
    notes: 'A Supabase Auth account is created automatically for each provider using their email. They will receive a password reset email to set their password. user_id is set automatically — do not include it in the CSV.',
  },
  users: {
    headers: ['full_name', 'email', 'phone', 'role'],
    example: ['Tom Henriksen', 'tom@example.com', '+47 900 00000', 'customer'],
    notes: 'Role must be: customer, provider, driver, or admin. A Supabase Auth account is created automatically. The user will receive a password reset email.',
  },
  drivers: {
    headers: ['provider_email', 'full_name', 'phone', 'licence_number', 'preferred_language', 'status'],
    example: ['ahmet@marmaris.com', 'Mehmet Kaya', '+90 532 111 0001', 'TR-001-2020', 'tr', 'available'],
    notes: 'Use provider_email to link the driver to their provider. preferred_language: en or tr. status: available, on_trip, or off_duty.',
  },
  vehicles: {
    headers: ['provider_email', 'type', 'make', 'model', 'year', 'plate_number', 'seats', 'luggage_capacity'],
    example: ['ahmet@marmaris.com', 'minivan', 'Mercedes', 'Vito', '2022', '48 MT 001', '7', '6'],
    notes: 'Use provider_email to link the vehicle to their provider. type: sedan, minivan, minibus, luxury, or suv.',
  },
}

export default function AdminImport() {
  const supabase = createClient() as any
  const [activeTab, setActiveTab] = useState<ImportType>('providers')
  const [csvText, setCsvText] = useState('')
  const [importing, setImporting] = useState(false)
  const [results, setResults] = useState<{ success: number, errors: string[] } | null>(null)

  function downloadTemplate(type: ImportType) {
    const t = TEMPLATES[type]
    const csv = [t.headers.join(','), t.example.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${type}-template.csv`
    a.click()
  }

  function parseCSV(text: string): Record<string, string>[] {
    const lines = text.trim().split('\n').map(l => l.trim()).filter(Boolean)
    if (lines.length < 2) return []
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    })
  }

  async function handleImport() {
    setImporting(true)
    setResults(null)
    const rows = parseCSV(csvText)
    if (rows.length === 0) {
      setResults({ success: 0, errors: ['No valid rows found. Check your CSV format.'] })
      setImporting(false)
      return
    }

    let success = 0
    const errors: string[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2
      try {
        if (activeTab === 'providers') {
          if (!row.company_name || !row.email) { errors.push(`Row ${rowNum}: company_name and email are required`); continue }

          // Create auth user
          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: row.email,
            email_confirm: true,
            user_metadata: { full_name: row.contact_name || row.company_name },
          })
          if (authErr) { errors.push(`Row ${rowNum} (${row.email}): ${authErr.message}`); continue }

          const userId = authData.user.id

          // Update user profile
          await supabase.from('users').upsert({
            id: userId,
            email: row.email,
            full_name: row.contact_name || null,
            phone: row.phone || null,
            role: 'provider',
          })

          // Create provider
          const { error: provErr } = await supabase.from('providers').insert({
            user_id: userId,
            company_name: row.company_name,
            contact_name: row.contact_name || null,
            phone: row.phone || null,
            description: row.description || null,
            commission_pct: parseFloat(row.commission_pct) || 15,
            is_approved: row.is_approved === 'true',
            is_subcontractor: false,
            avg_rating: 0,
            total_reviews: 0,
          })
          if (provErr) { errors.push(`Row ${rowNum}: Provider insert failed — ${provErr.message}`); continue }

          // Send password reset so they can set their password
          await supabase.auth.resetPasswordForEmail(row.email)
          success++

        } else if (activeTab === 'users') {
          if (!row.email) { errors.push(`Row ${rowNum}: email is required`); continue }

          const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
            email: row.email,
            email_confirm: true,
            user_metadata: { full_name: row.full_name || '' },
          })
          if (authErr) { errors.push(`Row ${rowNum} (${row.email}): ${authErr.message}`); continue }

          await supabase.from('users').upsert({
            id: authData.user.id,
            email: row.email,
            full_name: row.full_name || null,
            phone: row.phone || null,
            role: row.role || 'customer',
          })

          await supabase.auth.resetPasswordForEmail(row.email)
          success++

        } else if (activeTab === 'drivers') {
          if (!row.provider_email || !row.full_name || !row.phone) {
            errors.push(`Row ${rowNum}: provider_email, full_name and phone are required`); continue
          }

          const { data: provider } = await supabase
            .from('providers')
            .select('id')
            .eq('user_id', (await supabase.from('users').select('id').eq('email', row.provider_email).single()).data?.id)
            .single()

          if (!provider) {
            // Try finding provider by joining through users
            const { data: userRow } = await supabase.from('users').select('id').eq('email', row.provider_email).single()
            if (!userRow) { errors.push(`Row ${rowNum}: No provider found with email ${row.provider_email}`); continue }
            const { data: prov } = await supabase.from('providers').select('id').eq('user_id', userRow.id).single()
            if (!prov) { errors.push(`Row ${rowNum}: No provider found with email ${row.provider_email}`); continue }

            const { error: drvErr } = await supabase.from('drivers').insert({
              provider_id: prov.id,
              full_name: row.full_name,
              phone: row.phone,
              licence_number: row.licence_number || null,
              preferred_language: row.preferred_language || 'tr',
              status: row.status || 'available',
              is_active: true,
            })
            if (drvErr) { errors.push(`Row ${rowNum}: ${drvErr.message}`); continue }
            success++
            continue
          }

          const { error: drvErr } = await supabase.from('drivers').insert({
            provider_id: provider.id,
            full_name: row.full_name,
            phone: row.phone,
            licence_number: row.licence_number || null,
            preferred_language: row.preferred_language || 'tr',
            status: row.status || 'available',
            is_active: true,
          })
          if (drvErr) { errors.push(`Row ${rowNum}: ${drvErr.message}`); continue }
          success++

        } else if (activeTab === 'vehicles') {
          if (!row.provider_email || !row.make || !row.model || !row.seats) {
            errors.push(`Row ${rowNum}: provider_email, make, model and seats are required`); continue
          }

          const { data: userRow } = await supabase.from('users').select('id').eq('email', row.provider_email).single()
          if (!userRow) { errors.push(`Row ${rowNum}: No user found with email ${row.provider_email}`); continue }
          const { data: prov } = await supabase.from('providers').select('id').eq('user_id', userRow.id).single()
          if (!prov) { errors.push(`Row ${rowNum}: No provider found with email ${row.provider_email}`); continue }

          const { error: vehErr } = await supabase.from('vehicles').insert({
            provider_id: prov.id,
            type: row.type || 'sedan',
            make: row.make,
            model: row.model,
            year: row.year ? parseInt(row.year) : null,
            plate_number: row.plate_number || null,
            seats: parseInt(row.seats),
            luggage_capacity: parseInt(row.luggage_capacity) || 0,
            features: [],
            is_active: true,
          })
          if (vehErr) { errors.push(`Row ${rowNum}: ${vehErr.message}`); continue }
          success++
        }
      } catch (err: any) {
        errors.push(`Row ${rowNum}: Unexpected error — ${err.message}`)
      }
    }

    setResults({ success, errors })
    if (success > 0) setCsvText('')
    setImporting(false)
  }

  const t = TEMPLATES[activeTab]
  const inputStyle = { width:'100%', fontSize:'13px', padding:'11px 12px', backgroundColor:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:'6px', color:'#f0ede6', marginTop:'4px' }

  return (
    <div style={{padding:'20px'}}>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'4px'}}>Bulk import</h1>
      <p style={{fontSize:'13px', color:'rgba(255,255,255,0.4)', marginBottom:'20px'}}>Import providers, users, drivers and vehicles from CSV. IDs are created automatically.</p>

      {/* Tabs */}
      <div style={{display:'flex', gap:'4px', marginBottom:'20px', backgroundColor:'rgba(255,255,255,0.04)', padding:'4px', borderRadius:'8px', width:'fit-content'}}>
        {(['providers','users','drivers','vehicles'] as ImportType[]).map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setCsvText(''); setResults(null) }} style={{
            padding:'8px 16px', borderRadius:'6px', border:'none', cursor:'pointer', fontSize:'12px', fontWeight:'500',
            textTransform:'capitalize', backgroundColor: activeTab===tab?'rgba(255,255,255,0.1)':'transparent',
            color: activeTab===tab?'#f0ede6':'rgba(255,255,255,0.4)',
          }}>{tab}</button>
        ))}
      </div>

      {/* Notes */}
      <div style={{backgroundColor:'rgba(244,185,66,0.08)', border:'1px solid rgba(244,185,66,0.2)', borderRadius:'8px', padding:'14px', marginBottom:'16px'}}>
        <p style={{fontSize:'12px', color:'#f4b942', fontWeight:'500', marginBottom:'4px'}}>ℹ️ {activeTab.charAt(0).toUpperCase()+activeTab.slice(1)} import</p>
        <p style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', lineHeight:'1.5'}}>{t.notes}</p>
      </div>

      {/* Required columns */}
      <div style={{marginBottom:'16px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'8px'}}>Required columns</p>
        <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
          {t.headers.map(h => (
            <span key={h} style={{fontSize:'11px', padding:'4px 10px', backgroundColor:'rgba(255,255,255,0.06)', borderRadius:'4px', fontFamily:'monospace', color:'rgba(255,255,255,0.7)'}}>{h}</span>
          ))}
        </div>
      </div>

      {/* Download template */}
      <button onClick={() => downloadTemplate(activeTab)} style={{
        padding:'9px 16px', backgroundColor:'transparent', border:'1px solid rgba(255,255,255,0.15)',
        borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'12px', cursor:'pointer', marginBottom:'16px',
      }}>
        ↓ Download template CSV
      </button>

      {/* CSV input */}
      <div style={{marginBottom:'16px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.3)', marginBottom:'8px'}}>Paste CSV content</p>
        <textarea
          value={csvText}
          onChange={e => setCsvText(e.target.value)}
          placeholder={`${t.headers.join(',')}\n${t.example.join(',')}`}
          rows={8}
          style={{...inputStyle, resize:'vertical', fontFamily:'monospace', fontSize:'12px', lineHeight:'1.5'}}
        />
      </div>

      <button onClick={handleImport} disabled={importing || !csvText.trim()} style={{
        width:'100%', padding:'13px', backgroundColor: csvText.trim()?'#f4b942':'rgba(244,185,66,0.3)',
        color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600',
        cursor: csvText.trim()?'pointer':'not-allowed', textTransform:'uppercase', letterSpacing:'0.05em',
      }}>
        {importing ? `Importing ${activeTab}...` : `Import ${activeTab} →`}
      </button>

      {/* Results */}
      {results && (
        <div style={{marginTop:'16px'}}>
          {results.success > 0 && (
            <div style={{backgroundColor:'rgba(29,158,117,0.1)', border:'1px solid rgba(29,158,117,0.3)', borderRadius:'8px', padding:'14px', marginBottom:'10px'}}>
              <p style={{fontSize:'13px', color:'#1D9E75', fontWeight:'500'}}>
                ✓ {results.success} {activeTab} imported successfully
                {activeTab === 'providers' || activeTab === 'users' ? ' — password reset emails sent' : ''}
              </p>
            </div>
          )}
          {results.errors.length > 0 && (
            <div style={{backgroundColor:'rgba(162,45,45,0.1)', border:'1px solid rgba(162,45,45,0.3)', borderRadius:'8px', padding:'14px'}}>
              <p style={{fontSize:'12px', color:'#f09595', fontWeight:'500', marginBottom:'8px'}}>{results.errors.length} error{results.errors.length>1?'s':''}</p>
              {results.errors.map((e,i) => (
                <p key={i} style={{fontSize:'12px', color:'rgba(255,255,255,0.5)', marginBottom:'4px', fontFamily:'monospace'}}>• {e}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
