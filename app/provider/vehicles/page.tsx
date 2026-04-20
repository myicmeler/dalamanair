'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const VEHICLE_TYPES = ['sedan','minivan','minibus','luxury','suv']

export default function ProviderVehicles() {
  const supabase = createClient() as any
  const [vehicles, setVehicles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [providerId, setProviderId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ type:'sedan', make:'', model:'', year:'', plate_number:'', seats:'', luggage_capacity:'', features:[] as string[] })

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

  async function addVehicle() {
    if (!form.make||!form.model||!form.seats) return
    setSaving(true)
    const { data } = await supabase.from('vehicles').insert({
      provider_id:providerId, type:form.type, make:form.make, model:form.model,
      year:form.year?parseInt(form.year):null, plate_number:form.plate_number||null,
      seats:parseInt(form.seats), luggage_capacity:parseInt(form.luggage_capacity)||0,
      features:form.features, is_active:true,
    }).select().single()
    if (data) setVehicles(prev => [...prev, data])
    setForm({ type:'sedan', make:'', model:'', year:'', plate_number:'', seats:'', luggage_capacity:'', features:[] })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('vehicles').update({ is_active:!current }).eq('id', id)
    setVehicles(prev => prev.map(v => v.id===id ? {...v, is_active:!current} : v))
  }

  const inputStyle = { width:'100%', fontSize:'15px', padding:'12px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#f0ede6', marginTop:'4px' }

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Fleet</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{padding:'9px 16px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer'}}>+ Add</button>
      </div>

      {showAdd && (
        <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <h2 style={{fontSize:'14px', fontWeight:'500', marginBottom:'14px'}}>New vehicle</h2>
          <div style={{marginBottom:'12px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>Type</label>
            <select value={form.type} onChange={e => setForm(p=>({...p,type:e.target.value}))} style={inputStyle}>
              {VEHICLE_TYPES.map(t => <option key={t} value={t} style={{textTransform:'capitalize'}}>{t}</option>)}
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
            <div key={f.key} style={{marginBottom:'12px'}}>
              <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
          <div style={{marginBottom:'14px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'8px'}}>Features</label>
            <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
              {['ac','wifi','child_seat'].map(f => (
                <button key={f} onClick={() => setForm(p => ({...p, features:p.features.includes(f)?p.features.filter(x=>x!==f):[...p.features,f]}))}
                  style={{padding:'7px 12px', border:'1px solid', borderRadius:'5px', fontSize:'12px', cursor:'pointer', background:'none', textTransform:'capitalize',
                    borderColor:form.features.includes(f)?'#f4b942':'rgba(255,255,255,0.15)',
                    color:form.features.includes(f)?'#f4b942':'rgba(255,255,255,0.4)'}}>
                  {f.replace('_',' ')}
                </button>
              ))}
            </div>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={addVehicle} disabled={saving||!form.make||!form.model||!form.seats}
              style={{flex:1, padding:'12px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity:saving?0.5:1}}>
              {saving?'Saving...':'Save vehicle'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{padding:'12px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {vehicles.map((v:any) => (
            <div key={v.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'6px'}}>
                <div>
                  <p style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', marginBottom:'3px'}}>{v.type}</p>
                  <p style={{fontSize:'15px', fontWeight:'500'}}>{v.make} {v.model}</p>
                </div>
                <button onClick={() => toggleActive(v.id, v.is_active)} style={{
                  padding:'6px 12px', border:'1px solid', fontSize:'11px', borderRadius:'5px', cursor:'pointer', background:'none',
                  borderColor:v.is_active?'rgba(29,158,117,0.4)':'rgba(255,255,255,0.15)',
                  color:v.is_active?'#1D9E75':'rgba(255,255,255,0.4)',
                }}>{v.is_active?'Active':'Inactive'}</button>
              </div>
              <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{v.seats} pax · {v.luggage_capacity} bags{v.plate_number?` · ${v.plate_number}`:''}</p>
              {v.features?.length>0 && (
                <div style={{display:'flex', gap:'6px', flexWrap:'wrap', marginTop:'8px'}}>
                  {v.features.map((f:string) => (
                    <span key={f} style={{fontSize:'10px', padding:'3px 8px', backgroundColor:'rgba(255,255,255,0.06)', borderRadius:'10px', textTransform:'capitalize', color:'rgba(255,255,255,0.5)'}}>{f.replace('_',' ')}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
