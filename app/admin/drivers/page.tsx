'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminDrivers() {
  const supabase = createClient() as any
  const [drivers, setDrivers] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({ provider_id:'', full_name:'', phone:'', licence_number:'', preferred_language:'tr', status:'available' })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: dr }, { data: pr }] = await Promise.all([
      supabase.from('drivers').select('*, provider:providers(company_name)').order('full_name'),
      supabase.from('providers').select('id, company_name').eq('is_approved', true).order('company_name'),
    ])
    if (dr) setDrivers(dr)
    if (pr) setProviders(pr)
    setLoading(false)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('drivers').update({
      full_name: editForm.full_name,
      phone: editForm.phone,
      licence_number: editForm.licence_number || null,
      preferred_language: editForm.preferred_language,
      status: editForm.status,
      provider_id: editForm.provider_id,
    }).eq('id', id)
    await load()
    setEditingId(null)
    setSaving(false)
  }

  async function addDriver() {
    if (!newForm.provider_id || !newForm.full_name || !newForm.phone) return
    setSaving(true)
    await supabase.from('drivers').insert({
      provider_id: newForm.provider_id,
      full_name: newForm.full_name,
      phone: newForm.phone,
      licence_number: newForm.licence_number || null,
      preferred_language: newForm.preferred_language,
      status: newForm.status,
      is_active: true,
    })
    await load()
    setNewForm({ provider_id:'', full_name:'', phone:'', licence_number:'', preferred_language:'tr', status:'available' })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('drivers').update({ is_active:!current }).eq('id', id)
    setDrivers(prev => prev.map(d => d.id===id ? {...d, is_active:!current} : d))
  }

  const inputStyle = { width:'100%', fontSize:'13px', padding:'9px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6' }
  const statusColor: Record<string,string> = { available:'#1D9E75', on_trip:'#EF9F27', off_duty:'rgba(255,255,255,0.3)' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>All drivers</h1>
        <div style={{display:'flex', gap:'8px'}}>
          <a href="/admin/import" style={{padding:'9px 14px', backgroundColor:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'12px', textDecoration:'none'}}>↑ Bulk import</a>
          <button onClick={() => setShowAdd(!showAdd)} style={{padding:'9px 14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>+ Add driver</button>
        </div>
      </div>

      {showAdd && (
        <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <p style={{fontSize:'12px', fontWeight:'500', marginBottom:'14px', color:'rgba(255,255,255,0.7)'}}>New driver</p>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
            <div>
              <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Provider *</label>
              <select value={newForm.provider_id} onChange={e => setNewForm(p=>({...p,provider_id:e.target.value}))} style={inputStyle}>
                <option value="">Select provider</option>
                {providers.map((p:any) => <option key={p.id} value={p.id} style={{backgroundColor:'#1a1f26'}}>{p.company_name}</option>)}
              </select>
            </div>
            {[
              {label:'Full name *', key:'full_name', placeholder:'Ahmet Yilmaz'},
              {label:'Phone *', key:'phone', placeholder:'+90 532 111 0001'},
              {label:'Licence number', key:'licence_number', placeholder:'TR-001-2020'},
            ].map(f => (
              <div key={f.key}>
                <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>{f.label}</label>
                <input value={(newForm as any)[f.key]} onChange={e => setNewForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Language</label>
              <select value={newForm.preferred_language} onChange={e => setNewForm(p=>({...p,preferred_language:e.target.value}))} style={inputStyle}>
                <option value="tr" style={{backgroundColor:'#1a1f26'}}>Turkish</option>
                <option value="en" style={{backgroundColor:'#1a1f26'}}>English</option>
              </select>
            </div>
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={addDriver} disabled={saving||!newForm.provider_id||!newForm.full_name||!newForm.phone}
              style={{flex:1, padding:'11px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity:saving?0.5:1}}>
              {saving?'Saving...':'Add driver'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{padding:'11px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {drivers.map((d:any) => (
            <div key={d.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', overflow:'hidden'}}>
              {editingId === d.id ? (
                <div style={{padding:'14px'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Provider</label>
                      <select value={editForm.provider_id??''} onChange={e => setEditForm((p:any)=>({...p,provider_id:e.target.value}))} style={inputStyle}>
                        {providers.map((p:any) => <option key={p.id} value={p.id} style={{backgroundColor:'#1a1f26'}}>{p.company_name}</option>)}
                      </select>
                    </div>
                    {[
                      {label:'Full name', key:'full_name'},
                      {label:'Phone', key:'phone'},
                      {label:'Licence', key:'licence_number'},
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>{f.label}</label>
                        <input value={editForm[f.key]??''} onChange={e => setEditForm((p:any)=>({...p,[f.key]:e.target.value}))} style={inputStyle} />
                      </div>
                    ))}
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Status</label>
                      <select value={editForm.status??'available'} onChange={e => setEditForm((p:any)=>({...p,status:e.target.value}))} style={inputStyle}>
                        {['available','on_trip','off_duty'].map(s => <option key={s} value={s} style={{backgroundColor:'#1a1f26'}}>{s.replace('_',' ')}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => saveEdit(d.id)} disabled={saving} style={{flex:1, padding:'9px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>
                      {saving?'Saving...':'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} style={{padding:'9px 14px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{padding:'12px 14px', display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13px', fontWeight:'500'}}>{d.full_name}</div>
                    <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>{d.provider?.company_name||'—'} · {d.phone}</div>
                    {d.licence_number && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>{d.licence_number} · {d.preferred_language?.toUpperCase()}</div>}
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:'4px', flexShrink:0}}>
                    <div style={{width:'6px', height:'6px', borderRadius:'50%', backgroundColor:statusColor[d.status]||'rgba(255,255,255,0.2)'}} />
                    <span style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', textTransform:'capitalize'}}>{d.status?.replace('_',' ')}</span>
                  </div>
                  <div style={{display:'flex', gap:'6px', flexShrink:0}}>
                    <button onClick={() => { setEditingId(d.id); setEditForm({full_name:d.full_name, phone:d.phone, licence_number:d.licence_number||'', preferred_language:d.preferred_language, status:d.status, provider_id:d.provider_id}) }}
                      style={{padding:'5px 10px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', fontSize:'11px', cursor:'pointer'}}>Edit</button>
                    <button onClick={() => toggleActive(d.id, d.is_active)} style={{padding:'5px 10px', background:'none', border:'1px solid', borderRadius:'4px', fontSize:'11px', cursor:'pointer',
                      borderColor:d.is_active?'rgba(29,158,117,0.4)':'rgba(255,255,255,0.15)', color:d.is_active?'#1D9E75':'rgba(255,255,255,0.4)'}}>
                      {d.is_active?'Active':'Inactive'}
                    </button>
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
