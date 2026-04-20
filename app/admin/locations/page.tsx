'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminLocations() {
  const supabase = createClient() as any
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name:'', name_tr:'', type:'area', address:'', lat:'', lng:'', iata_code:'', sort_order:'0' })

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
      name:form.name, name_tr:form.name_tr||null, type:form.type,
      address:form.address||null, lat:form.lat?parseFloat(form.lat):null,
      lng:form.lng?parseFloat(form.lng):null, iata_code:form.iata_code||null,
      sort_order:parseInt(form.sort_order)||0, is_active:true,
    }).select().single()
    if (data) setLocations(prev => [...prev, data].sort((a,b) => a.sort_order-b.sort_order||a.name.localeCompare(b.name)))
    setForm({ name:'', name_tr:'', type:'area', address:'', lat:'', lng:'', iata_code:'', sort_order:'0' })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('locations').update({ is_active:!current }).eq('id', id)
    setLocations(prev => prev.map(l => l.id===id ? {...l, is_active:!current} : l))
  }

  const inputStyle = { width:'100%', fontSize:'15px', padding:'12px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#f0ede6', marginTop:'4px' }
  const typeColor: Record<string,string> = { airport:'#378ADD', hotel:'#1D9E75', area:'#8a8680', port:'#EF9F27' }

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Locations</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{padding:'9px 16px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer'}}>+ Add</button>
      </div>

      {showAdd && (
        <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <div style={{marginBottom:'12px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>Type</label>
            <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))} style={inputStyle}>
              {['airport','hotel','area','port'].map(t => <option key={t} value={t} style={{textTransform:'capitalize'}}>{t}</option>)}
            </select>
          </div>
          {[
            {label:'Name (EN) *', key:'name', placeholder:'Içmeler'},
            {label:'Name (TR)', key:'name_tr', placeholder:'İçmeler'},
            {label:'IATA code', key:'iata_code', placeholder:'DLM'},
            {label:'Sort order', key:'sort_order', placeholder:'0'},
          ].map(f => (
            <div key={f.key} style={{marginBottom:'12px'}}>
              <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={addLocation} disabled={saving||!form.name} style={{flex:1, padding:'12px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity:saving?0.5:1}}>
              {saving?'Saving...':'Save location'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{padding:'12px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {locations.map((l:any) => (
            <div key={l.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px', display:'flex', alignItems:'center', gap:'12px'}}>
              <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:`${typeColor[l.type]||'#8a8680'}20`, color:typeColor[l.type]||'#8a8680', flexShrink:0, textTransform:'capitalize'}}>{l.type}</span>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:'14px', fontWeight:'500'}}>{l.name}</div>
                {l.name_tr && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>{l.name_tr}</div>}
                {l.iata_code && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)'}}>{l.iata_code}</div>}
              </div>
              <button onClick={() => toggleActive(l.id, l.is_active)} style={{
                padding:'6px 10px', border:'1px solid', fontSize:'11px', borderRadius:'5px', cursor:'pointer', background:'none', flexShrink:0,
                borderColor:l.is_active?'rgba(29,158,117,0.4)':'rgba(255,255,255,0.15)',
                color:l.is_active?'#1D9E75':'rgba(255,255,255,0.4)',
              }}>{l.is_active?'On':'Off'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
