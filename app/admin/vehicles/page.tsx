'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const VEHICLE_TYPES = ['sedan','minivan','minibus','luxury','suv']

export default function AdminVehicles() {
  const supabase = createClient() as any
  const [vehicles, setVehicles] = useState<any[]>([])
  const [providers, setProviders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({ provider_id:'', type:'sedan', make:'', model:'', year:'', plate_number:'', seats:'', luggage_capacity:'' })

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: vh }, { data: pr }] = await Promise.all([
      supabase.from('vehicles').select('*, provider:providers(company_name)').order('type'),
      supabase.from('providers').select('id, company_name').eq('is_approved', true).order('company_name'),
    ])
    if (vh) setVehicles(vh)
    if (pr) setProviders(pr)
    setLoading(false)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('vehicles').update({
      provider_id: editForm.provider_id,
      type: editForm.type,
      make: editForm.make,
      model: editForm.model,
      year: editForm.year ? parseInt(editForm.year) : null,
      plate_number: editForm.plate_number || null,
      seats: parseInt(editForm.seats),
      luggage_capacity: parseInt(editForm.luggage_capacity) || 0,
    }).eq('id', id)
    await load()
    setEditingId(null)
    setSaving(false)
  }

  async function addVehicle() {
    if (!newForm.provider_id || !newForm.make || !newForm.model || !newForm.seats) return
    setSaving(true)
    await supabase.from('vehicles').insert({
      provider_id: newForm.provider_id,
      type: newForm.type,
      make: newForm.make,
      model: newForm.model,
      year: newForm.year ? parseInt(newForm.year) : null,
      plate_number: newForm.plate_number || null,
      seats: parseInt(newForm.seats),
      luggage_capacity: parseInt(newForm.luggage_capacity) || 0,
      features: [],
      is_active: true,
    })
    await load()
    setNewForm({ provider_id:'', type:'sedan', make:'', model:'', year:'', plate_number:'', seats:'', luggage_capacity:'' })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('vehicles').update({ is_active:!current }).eq('id', id)
    setVehicles(prev => prev.map(v => v.id===id ? {...v, is_active:!current} : v))
  }

  const inputStyle = { width:'100%', fontSize:'13px', padding:'9px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>All vehicles</h1>
        <div style={{display:'flex', gap:'8px'}}>
          <a href="/admin/import" style={{padding:'9px 14px', backgroundColor:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'12px', textDecoration:'none'}}>↑ Bulk import</a>
          <button onClick={() => setShowAdd(!showAdd)} style={{padding:'9px 14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>+ Add vehicle</button>
        </div>
      </div>

      {showAdd && (
        <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <p style={{fontSize:'12px', fontWeight:'500', marginBottom:'14px', color:'rgba(255,255,255,0.7)'}}>New vehicle</p>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
            <div>
              <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Provider *</label>
              <select value={newForm.provider_id} onChange={e => setNewForm(p=>({...p,provider_id:e.target.value}))} style={inputStyle}>
                <option value="">Select provider</option>
                {providers.map((p:any) => <option key={p.id} value={p.id} style={{backgroundColor:'#1a1f26'}}>{p.company_name}</option>)}
              </select>
            </div>
            <div>
              <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Type</label>
              <select value={newForm.type} onChange={e => setNewForm(p=>({...p,type:e.target.value}))} style={inputStyle}>
                {VEHICLE_TYPES.map(t => <option key={t} value={t} style={{backgroundColor:'#1a1f26', textTransform:'capitalize'}}>{t}</option>)}
              </select>
            </div>
            {[
              {label:'Make *', key:'make', placeholder:'Mercedes'},
              {label:'Model *', key:'model', placeholder:'Vito'},
              {label:'Seats *', key:'seats', placeholder:'7'},
              {label:'Luggage capacity', key:'luggage_capacity', placeholder:'6'},
              {label:'Year', key:'year', placeholder:'2023'},
              {label:'Plate number', key:'plate_number', placeholder:'48 MT 001'},
            ].map(f => (
              <div key={f.key}>
                <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>{f.label}</label>
                <input value={(newForm as any)[f.key]} onChange={e => setNewForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={addVehicle} disabled={saving||!newForm.provider_id||!newForm.make||!newForm.model||!newForm.seats}
              style={{flex:1, padding:'11px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity:saving?0.5:1}}>
              {saving?'Saving...':'Add vehicle'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{padding:'11px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {vehicles.map((v:any) => (
            <div key={v.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', overflow:'hidden'}}>
              {editingId === v.id ? (
                <div style={{padding:'14px'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Provider</label>
                      <select value={editForm.provider_id??''} onChange={e => setEditForm((p:any)=>({...p,provider_id:e.target.value}))} style={inputStyle}>
                        {providers.map((p:any) => <option key={p.id} value={p.id} style={{backgroundColor:'#1a1f26'}}>{p.company_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Type</label>
                      <select value={editForm.type??'sedan'} onChange={e => setEditForm((p:any)=>({...p,type:e.target.value}))} style={inputStyle}>
                        {VEHICLE_TYPES.map(t => <option key={t} value={t} style={{backgroundColor:'#1a1f26', textTransform:'capitalize'}}>{t}</option>)}
                      </select>
                    </div>
                    {[
                      {label:'Make', key:'make'},
                      {label:'Model', key:'model'},
                      {label:'Seats', key:'seats'},
                      {label:'Luggage', key:'luggage_capacity'},
                      {label:'Year', key:'year'},
                      {label:'Plate', key:'plate_number'},
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>{f.label}</label>
                        <input value={editForm[f.key]??''} onChange={e => setEditForm((p:any)=>({...p,[f.key]:e.target.value}))} style={inputStyle} />
                      </div>
                    ))}
                  </div>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => saveEdit(v.id)} disabled={saving} style={{flex:1, padding:'9px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>
                      {saving?'Saving...':'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} style={{padding:'9px 14px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{padding:'12px 14px', display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13px', fontWeight:'500'}}>{v.make} {v.model} <span style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', textTransform:'capitalize'}}>({v.type})</span></div>
                    <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>{v.provider?.company_name||'—'} · {v.seats} seats · {v.luggage_capacity} bags{v.plate_number?` · ${v.plate_number}`:''}</div>
                    {v.year && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>{v.year}</div>}
                  </div>
                  <div style={{display:'flex', gap:'6px', flexShrink:0}}>
                    <button onClick={() => { setEditingId(v.id); setEditForm({provider_id:v.provider_id, type:v.type, make:v.make, model:v.model, year:v.year||'', plate_number:v.plate_number||'', seats:v.seats, luggage_capacity:v.luggage_capacity}) }}
                      style={{padding:'5px 10px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', fontSize:'11px', cursor:'pointer'}}>Edit</button>
                    <button onClick={() => toggleActive(v.id, v.is_active)} style={{padding:'5px 10px', background:'none', border:'1px solid', borderRadius:'4px', fontSize:'11px', cursor:'pointer',
                      borderColor:v.is_active?'rgba(29,158,117,0.4)':'rgba(255,255,255,0.15)', color:v.is_active?'#1D9E75':'rgba(255,255,255,0.4)'}}>
                      {v.is_active?'Active':'Inactive'}
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
