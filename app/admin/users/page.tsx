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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('users').select('*').order('created_at', {ascending:false})
      if (data) setUsers(data)
      setLoading(false)
    }
    load()
  }, [])

  async function updateRole(id: string, role: string) {
    await supabase.from('users').update({ role }).eq('id', id)
    setUsers(prev => prev.map(u => u.id===id ? {...u, role} : u))
  }

  const filtered = users.filter(u => {
    if (roleFilter!=='all' && u.role!==roleFilter) return false
    if (search) {
      const s = search.toLowerCase()
      return (u.email||'').toLowerCase().includes(s)||(u.full_name||'').toLowerCase().includes(s)
    }
    return true
  })

  const roleColor: Record<string,string> = { customer:'rgba(255,255,255,0.2)', provider:'#378ADD', driver:'#1D9E75', admin:'#f09595' }

  return (
    <div style={{padding:'16px'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px'}}>
        <h1 style={{fontSize:'20px', fontWeight:'500'}}>Users</h1>
        <span style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{filtered.length}</span>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search email or name..."
        style={{width:'100%', fontSize:'14px', padding:'11px 12px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#f0ede6', marginBottom:'12px'}} />

      <div style={{display:'flex', gap:'8px', marginBottom:'16px', overflowX:'auto', paddingBottom:'4px'}}>
        {['all',...ROLES].map(r => (
          <button key={r} onClick={() => setRoleFilter(r)} style={{
            padding:'7px 12px', borderRadius:'14px', border:'1px solid', fontSize:'11px', cursor:'pointer', whiteSpace:'nowrap', textTransform:'capitalize', background:'none',
            borderColor:roleFilter===r?'#f4b942':'rgba(255,255,255,0.15)',
            color:roleFilter===r?'#f4b942':'rgba(255,255,255,0.4)',
          }}>{r}</button>
        ))}
      </div>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {filtered.map((u:any) => (
            <div key={u.id} style={{backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'14px', display:'flex', alignItems:'center', gap:'12px'}}>
              <div style={{flex:1, minWidth:0}}>
                <div style={{fontSize:'13px', fontWeight:'500', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.full_name||u.email}</div>
                {u.full_name && <div style={{fontSize:'11px', color:'rgba(255,255,255,0.4)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{u.email}</div>}
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'2px'}}>
                  {new Date(u.created_at).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                </div>
              </div>
              <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{
                fontSize:'11px', padding:'6px 8px', borderRadius:'5px', border:'1px solid', cursor:'pointer',
                borderColor:roleColor[u.role]||'rgba(255,255,255,0.15)',
                color:roleColor[u.role]||'rgba(255,255,255,0.4)',
                backgroundColor:'rgba(255,255,255,0.06)',
              }}>
                {ROLES.map(r => <option key={r} value={r} style={{backgroundColor:'#1a1f26', color:'#f0ede6', textTransform:'capitalize'}}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
