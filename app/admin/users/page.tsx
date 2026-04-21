'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const ROLES = ['customer','provider','driver','admin']

export default function AdminUsers() {
  const supabase = createClient() as any
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [roleFilter, setRoleFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string|null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newForm, setNewForm] = useState({ full_name:'', email:'', phone:'', role:'customer' })

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending:false })
    if (data) setUsers(data)
    setLoading(false)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    await supabase.from('users').update({
      full_name: editForm.full_name || null,
      phone: editForm.phone || null,
      role: editForm.role,
    }).eq('id', id)
    setUsers(prev => prev.map(u => u.id===id ? {...u, ...editForm} : u))
    setEditingId(null)
    setSaving(false)
  }

  async function addUser() {
    if (!newForm.email) return
    setSaving(true)
    try {
      const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
        email: newForm.email,
        email_confirm: true,
        user_metadata: { full_name: newForm.full_name || '' },
      })
      if (authErr) throw authErr

      await supabase.from('users').upsert({
        id: authData.user.id,
        email: newForm.email,
        full_name: newForm.full_name || null,
        phone: newForm.phone || null,
        role: newForm.role,
      })

      await supabase.auth.resetPasswordForEmail(newForm.email)
      await load()
      setNewForm({ full_name:'', email:'', phone:'', role:'customer' })
      setShowAdd(false)
    } catch (err: any) {
      alert(err.message)
    }
    setSaving(false)
  }

  const filtered = users.filter(u => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (u.email||'').toLowerCase().includes(s) || (u.full_name||'').toLowerCase().includes(s)
    }
    return true
  })

  const roleColor: Record<string,string> = { customer:'rgba(255,255,255,0.3)', provider:'#378ADD', driver:'#1D9E75', admin:'#f09595' }
  const inputStyle = { width:'100%', fontSize:'13px', padding:'9px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6' }

  return (
    <div style={{padding:'20px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px', flexWrap:'wrap', gap:'10px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Users</h1>
        <div style={{display:'flex', gap:'8px'}}>
          <a href="/admin/import" style={{padding:'9px 14px', backgroundColor:'transparent', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'12px', textDecoration:'none'}}>
            ↑ Bulk import
          </a>
          <button onClick={() => setShowAdd(!showAdd)} style={{padding:'9px 14px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>
            + Add user
          </button>
        </div>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email or name..."
        style={{...inputStyle, marginBottom:'12px'}} />

      <div style={{display:'flex', gap:'8px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px'}}>
        {['all',...ROLES].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{
            padding:'7px 12px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', textTransform:'capitalize', background:'none',
            borderColor:roleFilter===r?'#f4b942':'rgba(255,255,255,0.15)', color:roleFilter===r?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{r}{roleFilter===r?` (${filtered.length})`:''}</button>
        ))}
      </div>

      {showAdd && (
        <div style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'16px', marginBottom:'16px'}}>
          <p style={{fontSize:'12px', fontWeight:'500', marginBottom:'14px', color:'rgba(255,255,255,0.7)'}}>New user — a login account is created automatically and a password reset email is sent</p>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
            {[
              {label:'Full name', key:'full_name', placeholder:'Tom Henriksen'},
              {label:'Email *', key:'email', placeholder:'tom@example.com'},
              {label:'Phone', key:'phone', placeholder:'+47 900 00000'},
            ].map(f => (
              <div key={f.key}>
                <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>{f.label}</label>
                <input value={(newForm as any)[f.key]} onChange={e => setNewForm(p=>({...p,[f.key]:e.target.value}))} placeholder={f.placeholder} style={inputStyle} />
              </div>
            ))}
            <div>
              <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Role</label>
              <select value={newForm.role} onChange={e => setNewForm(p=>({...p,role:e.target.value}))} style={inputStyle}>
                {ROLES.map(r => <option key={r} value={r} style={{textTransform:'capitalize', backgroundColor:'#1a1f26'}}>{r}</option>)}
              </select>
            </div>
          </div>
          <div style={{display:'flex', gap:'8px'}}>
            <button onClick={addUser} disabled={saving||!newForm.email} style={{flex:1, padding:'11px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity:saving?0.5:1}}>
              {saving?'Creating...':'Create user & send login email'}
            </button>
            <button onClick={() => setShowAdd(false)} style={{padding:'11px 16px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.5)', fontSize:'13px', cursor:'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {filtered.map((u:any) => (
            <div key={u.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', overflow:'hidden'}}>
              {editingId === u.id ? (
                <div style={{padding:'14px'}}>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', marginBottom:'10px'}}>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Full name</label>
                      <input value={editForm.full_name??''} onChange={e => setEditForm((p:any)=>({...p,full_name:e.target.value}))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Phone</label>
                      <input value={editForm.phone??''} onChange={e => setEditForm((p:any)=>({...p,phone:e.target.value}))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{fontSize:'9px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.4)', display:'block', marginBottom:'4px'}}>Role</label>
                      <select value={editForm.role??'customer'} onChange={e => setEditForm((p:any)=>({...p,role:e.target.value}))} style={inputStyle}>
                        {ROLES.map(r => <option key={r} value={r} style={{backgroundColor:'#1a1f26', textTransform:'capitalize'}}>{r}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{display:'flex', gap:'8px'}}>
                    <button onClick={() => saveEdit(u.id)} disabled={saving} style={{flex:1, padding:'9px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'500', cursor:'pointer'}}>
                      {saving?'Saving...':'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)} style={{padding:'9px 14px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'rgba(255,255,255,0.5)', fontSize:'12px', cursor:'pointer'}}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div style={{padding:'12px 14px', display:'flex', alignItems:'center', gap:'12px'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontSize:'13px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.full_name||u.email}</div>
                    {u.full_name && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.email}</div>}
                    {u.phone && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)'}}>{u.phone}</div>}
                  </div>
                  <span style={{fontSize:'10px', padding:'3px 8px', borderRadius:'10px', backgroundColor:`${roleColor[u.role]||'rgba(255,255,255,0.2)'}20`, color:roleColor[u.role]||'rgba(255,255,255,0.4)', flexShrink:0, textTransform:'capitalize'}}>{u.role}</span>
                  <button onClick={() => { setEditingId(u.id); setEditForm({ full_name:u.full_name||'', phone:u.phone||'', role:u.role }) }}
                    style={{padding:'5px 10px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'4px', color:'rgba(255,255,255,0.5)', fontSize:'11px', cursor:'pointer', flexShrink:0}}>Edit</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
