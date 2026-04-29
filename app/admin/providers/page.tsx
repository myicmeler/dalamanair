'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

type Provider = {
  id: string
  user_id: string
  company_name: string
  contact_name: string | null
  phone: string | null
  description: string | null
  commission_pct: number
  is_approved: boolean
  tursab_number: string | null
  insurance_number: string | null
  avg_rating: number
  total_reviews: number
  user?: { email: string }
}

export default function AdminProviders() {
  const supabase = createClient() as any
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all'|'pending'|'approved'>('all')
  const [editing, setEditing] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<Partial<Provider>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({
    company_name:'', contact_name:'', email:'', phone:'',
    commission_pct:'15', is_approved:'true',
    tursab_number:'', insurance_number:'',
  })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('providers')
      .select('*, user:users(email)')
      .order('created_at', { ascending:false })
    if (data) setProviders(data)
    setLoading(false)
  }

  async function approve(id: string) {
    await supabase.from('providers').update({ is_approved:true }).eq('id', id)
    setProviders(prev => prev.map(p => p.id===id ? {...p, is_approved:true} : p))
  }

  async function unapprove(id: string) {
    await supabase.from('providers').update({ is_approved:false }).eq('id', id)
    setProviders(prev => prev.map(p => p.id===id ? {...p, is_approved:false} : p))
  }

  function startEdit(p: Provider) {
    setEditing(p.id)
    setEditForm({
      company_name: p.company_name,
      contact_name: p.contact_name||'',
      phone: p.phone||'',
      description: p.description||'',
      commission_pct: p.commission_pct,
      tursab_number: p.tursab_number||'',
      insurance_number: p.insurance_number||'',
    })
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('providers').update({
      company_name:     editForm.company_name,
      contact_name:     editForm.contact_name || null,
      phone:            editForm.phone || null,
      description:      editForm.description || null,
      commission_pct:   parseFloat(String(editForm.commission_pct)) || 15,
      tursab_number:    editForm.tursab_number || null,
      insurance_number: editForm.insurance_number || null,
    }).eq('id', id)
    await load()
    setEditing(null)
    setSaving(false)
  }

  async function addProvider() {
    if (!newForm.company_name || !newForm.email) return
    setSaving(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: newForm.email,
        email_confirm: true,
        user_metadata: { full_name: newForm.contact_name || newForm.company_name },
      })
      if (authErr) throw authErr

      await supabase.from('users').upsert({
        id: authData.user.id,
        email: newForm.email,
        full_name: newForm.contact_name || null,
        phone: newForm.phone || null,
        role: 'provider',
      })

      const { data: provider } = await supabase.from('providers').insert({
        user_id:          authData.user.id,
        company_name:     newForm.company_name,
        contact_name:     newForm.contact_name || null,
        phone:            newForm.phone || null,
        commission_pct:   parseFloat(newForm.commission_pct) || 15,
        is_approved:      newForm.is_approved === 'true',
        tursab_number:    newForm.tursab_number || null,
        insurance_number: newForm.insurance_number || null,
        is_subcontractor: false,
        avg_rating:       0,
        total_reviews:    0,
      }).select('*, user:users(email)').single()

      await supabase.auth.resetPasswordForEmail(newForm.email)
      if (provider) setProviders(prev => [provider, ...prev])
      setNewForm({ company_name:'', contact_name:'', email:'', phone:'', commission_pct:'15', is_approved:'true', tursab_number:'', insurance_number:'' })
      setShowAdd(false)
    } catch (err: any) { alert(err.message) }
    setSaving(false)
  }

  const filtered = providers.filter(p => {
    if (filter === 'pending') return !p.is_approved
    if (filter === 'approved') return p.is_approved
    return true
  })

  const inputStyle = { width:'100%', fontSize:'13px', padding:'9px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6' }
  const labelStyle = { fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase' as const, color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px' }

  const fields = [
    {label:'Company name *', key:'company_name', placeholder:'Marmaris Transfer Co.'},
    {label:'Contact name', key:'contact_name', placeholder:'Ahmet Yilmaz'},
    {label:'Email * (login)', key:'email', placeholder:'ahmet@marmaris.com'},
    {label:'Phone', key:'phone', placeholder:'+90 532 100 0001'},
    {label:'Commission %', key:'commission_pct', placeholder:'15'},
    {label:'TURSAB number', key:'tursab_number', placeholder:'A-XXXX'},
    {label:'Insurance number', key:'insurance_number', placeholder:'POL-XXXXXXXX'},
  ]

  const editFields = [
    {label:'Company name', key:'company_name'},
    {label:'Contact name', key:'contact_name'},
    {label:'Phone', key:'phone'},
    {label:'Commission %', key:'commission_pct'},
    {label:'TURSAB number', key:'tursab_number'},
    {label:'Insurance number', key:'insurance_number'},
  ]

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Providers</h1>
        <div style={{display:'flex', gap:'8px'}}>
          <a href="/admin/import" style={{padding:'9px 14px', backgroundColor:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'12px', textDecoration:'none'}}>
            ↑ Bulk import
          </a>
          <button onClick={() => setShowAdd(!showAdd)} style={{padding:'9px 14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>
            + Add provider
          </button>
        </div>
      </div>

      <div style={{display:'flex', gap:'8px', marginBottom:'16px'}}>
        {(['all','pending','approved'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding:'7px 14px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', textTransform:'capitalize', background:'none',
            borderColor:filter===f?'#f4b942':'rgba(255,255,255,0.15)',
            color:filter===f?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{f} {filter===f&&`(${filtered.length})`}</button>
        ))}
      </div>

      {showAdd && (
        <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <p style={{fontSize:'12px', fontWeight:'500', marginBottom:'14px', color:'rgba(255,255,255,0.7)'}}>New provider — login account created automatically</p>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
            {fields.map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input value={(newForm as any)[f.key]} onChange={e => setNewForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={labelStyle}>Approved</label>
              <select value={newForm.is_approved} onChange={e => setNewForm(p=>({...p,is_approved:e.target.value}))} style={inputStyle}>
                <option value="true">Yes — approved</option>
                <option value="false">No — pending</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={addProvider} disabled={saving||!newForm.company_name||!newForm.email}
              style={{flex:1, padding:'11px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity:saving?0.5:1}}>
              {saving?'Creating...':'Create provider & send login email'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{padding:'11px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {filtered.map((p:any) => (
            <div key={p.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', overflow:'hidden'}}>
              {editing === p.id ? (
                <div style={{padding:'16px'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                    {editFields.map(f => (
                      <div key={f.key}>
                        <label style={labelStyle}>{f.label}</label>
                        <input value={(editForm as any)[f.key]??''} onChange={e => setEditForm(prev=>({...prev,[f.key]:e.target.value}))} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                  <div style={{marginBottom:'10px'}}>
                    <label style={labelStyle}>Description</label>
                    <textarea value={(editForm as any).description??''} onChange={e => setEditForm(prev=>({...prev,description:e.target.value}))} rows={2} style={{...inputStyle, resize:'none', width:'100%'}} />
                  </div>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => saveEdit(p.id)} disabled={saving} style={{flex:1, padding:'10px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>
                      {saving?'Saving...':'Save changes'}
                    </button>
                    <button onClick={() => setEditing(null)} style={{padding:'10px 14px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{padding:'14px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'12px'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'15px', fontWeight:'500', marginBottom:'3px'}}>{p.company_name}</div>
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'2px'}}>{p.user?.email||'—'} · {p.contact_name||'—'} · {p.phone||'—'}</div>
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.3)', marginBottom:'4px'}}>Commission: {p.commission_pct}% · {p.avg_rating?.toFixed(1)||'0.0'}★ ({p.total_reviews} reviews)</div>
                    <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
                      {p.tursab_number && (
                        <span style={{fontSize:'10px', padding:'2px 8px', backgroundColor:'rgba(55,138,221,0.15)', color:'#378ADD', borderRadius:'8px'}}>
                          TURSAB: {p.tursab_number}
                        </span>
                      )}
                      {p.insurance_number && (
                        <span style={{fontSize:'10px', padding:'2px 8px', backgroundColor:'rgba(29,158,117,0.15)', color:'#1D9E75', borderRadius:'8px'}}>
                          Insurance: {p.insurance_number}
                        </span>
                      )}
                      {!p.tursab_number && (
                        <span style={{fontSize:'10px', padding:'2px 8px', backgroundColor:'rgba(239,159,39,0.1)', color:'#EF9F27', borderRadius:'8px'}}>
                          No TURSAB
                        </span>
                      )}
                      {!p.insurance_number && (
                        <span style={{fontSize:'10px', padding:'2px 8px', backgroundColor:'rgba(239,159,39,0.1)', color:'#EF9F27', borderRadius:'8px'}}>
                          No insurance
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{display:'flex', flexDirection:'column', gap:'6px', alignItems:'flex-end', flexShrink:0}}>
                    <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px',
                      backgroundColor:p.is_approved?'rgba(29,158,117,0.15)':'rgba(239,159,39,0.15)',
                      color:p.is_approved?'#1D9E75':'#EF9F27'}}>
                      {p.is_approved?'Approved':'Pending'}
                    </span>
                    <div style={{display:'flex', gap:'6px'}}>
                      <button onClick={() => startEdit(p)} style={{padding:'5px 10px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', fontSize:'11px', cursor:'pointer'}}>Edit</button>
                      <button onClick={() => p.is_approved ? unapprove(p.id) : approve(p.id)} style={{padding:'5px 10px', background:'none', border:'1px solid', borderRadius:'4px', fontSize:'11px', cursor:'pointer',
                        borderColor:p.is_approved?'rgba(162,45,45,0.4)':'rgba(29,158,117,0.4)',
                        color:p.is_approved?'#f09595':'#1D9E75'}}>
                        {p.is_approved?'Unapprove':'Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
