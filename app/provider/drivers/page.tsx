'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function ProviderDrivers() {
  const supabase = createClient() as any
  const [drivers, setDrivers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [providerId, setProviderId] = useState('')
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ full_name:'', phone:'', licence_number:'', preferred_language:'tr' })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single()
      if (!provider) return
      setProviderId(provider.id)
      const { data: dr } = await supabase.from('drivers').select('*').eq('provider_id', provider.id).order('full_name')
      if (dr) setDrivers(dr)
      setLoading(false)
    }
    load()
  }, [])

  async function addDriver() {
    if (!form.full_name || !form.phone) return
    setSaving(true)
    const { data } = await supabase.from('drivers').insert({...form, provider_id:providerId, is_active:true, status:'available'}).select().single()
    if (data) setDrivers(prev => [...prev, data])
    setForm({ full_name:'', phone:'', licence_number:'', preferred_language:'tr' })
    setShowAdd(false)
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('drivers').update({ is_active:!current }).eq('id', id)
    setDrivers(prev => prev.map(d => d.id===id ? {...d, is_active:!current} : d))
  }

  const statusDot: Record<string,string> = { available:'#1D9E75', on_trip:'#EF9F27', off_duty:'rgba(255,255,255,0.2)' }
  const inputStyle = { width:'100%', fontSize:'15px', padding:'12px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#f0ede6', marginTop:'4px' }

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Drivers</h1>
        <button onClick={() => setShowAdd(!showAdd)} style={{padding:'9px 16px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer'}}>
          + Add
        </button>
      </div>

      {showAdd && (
        <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <h2 style={{fontSize:'14px', fontWeight:'500', marginBottom:'14px'}}>New driver</h2>
          {[
            {label:'Full name *', key:'full_name', placeholder:'Ahmet Yılmaz'},
            {label:'Phone *', key:'phone', placeholder:'+90 532 000 0000'},
            {label:'Licence number', key:'licence_number', placeholder:'Optional'},
          ].map(f => (
            <div key={f.key} style={{marginBottom:'12px'}}>
              <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>{f.label}</label>
              <input value={(form as any)[f.key]} onChange={e => setForm(p => ({...p, [f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle} />
            </div>
          ))}
          <div style={{marginBottom:'14px'}}>
            <label style={{fontSize:'10px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)'}}>Language</label>
            <select value={form.preferred_language} onChange={e => setForm(p => ({...p, preferred_language:e.target.value}))} style={inputStyle}>
              <option value="tr">Turkish</option>
              <option value="en">English</option>
            </select>
          </div>
          <div style={{display:'flex', gap:'10px'}}>
            <button onClick={addDriver} disabled={saving||!form.full_name||!form.phone}
              style={{flex:1, padding:'12px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity:saving?0.5:1}}>
              {saving?'Saving...':'Save driver'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{padding:'12px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : drivers.length===0 ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)', fontSize:'14px'}}>No drivers yet</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
          {drivers.map((d:any) => (
            <div key={d.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px', display:'flex', alignItems:'center', gap:'12px'}}>
              <div style={{width:'36px', height:'36px', borderRadius:'50%', backgroundColor:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'500', flexShrink:0}}>
                {d.full_name.split(' ').map((w:string)=>w[0]).join('').slice(0,2).toUpperCase()}
              </div>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:'14px', fontWeight:'500', marginBottom:'2px'}}>{d.full_name}</div>
                <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{d.phone}</div>
                <div style={{display:'flex', alignItems:'center', gap:'6px', marginTop:'4px'}}>
                  <div style={{width:'6px', height:'6px', borderRadius:'50%', backgroundColor:statusDot[d.status]??'rgba(255,255,255,0.2)'}} />
                  <span style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', textTransform:'capitalize'}}>{d.status?.replace('_',' ')}</span>
                </div>
              </div>
              <button onClick={() => toggleActive(d.id, d.is_active)} style={{
                padding:'7px 12px', border:'1px solid', fontSize:'11px', borderRadius:'5px', cursor:'pointer', background:'none',
                borderColor: d.is_active ? 'rgba(29,158,117,0.4)' : 'rgba(255,255,255,0.15)',
                color: d.is_active ? '#1D9E75' : 'rgba(255,255,255,0.4)',
              }}>{d.is_active?'Active':'Inactive'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
