'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminUsers() {
  const supabase = createClient() as any
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string|null>(null)
  const [newPassword, setNewPassword] = useState<Record<string,string>>({})
  const [showReset, setShowReset] = useState<string|null>(null)
  const [message, setMessage] = useState<Record<string,{text:string,ok:boolean}>>({})
  const [toggling, setToggling] = useState<string|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  async function resetPassword(userId: string, email: string) {
    const pwd = newPassword[userId]
    if (!pwd || pwd.length < 8) {
      setMessage(p => ({...p, [userId]: {text:'Min. 8 characters', ok:false}}))
      return
    }
    setResetting(userId)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'reset_password', userId, password: pwd }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)
      setMessage(p => ({...p, [userId]: {text:'Password updated ✓', ok:true}}))
      setShowReset(null)
      setNewPassword(p => ({...p, [userId]: ''}))
    } catch (err: any) {
      setMessage(p => ({...p, [userId]: {text:err.message, ok:false}}))
    }
    setResetting(null)
  }

  async function toggleActive(userId: string, currentlyActive: boolean) {
    setToggling(userId)
    const { error } = await supabase.from('users').update({ is_active: !currentlyActive }).eq('id', userId)
    if (!error) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentlyActive } : u))
      setMessage(p => ({...p, [userId]: {text: !currentlyActive ? 'Account reactivated ✓' : 'Account deactivated', ok: !currentlyActive}}))
    }
    setToggling(null)
  }

  const roleColors: Record<string,{bg:string,color:string}> = {
    admin:    { bg:'rgba(162,45,45,0.2)',   color:'#f09595' },
    provider: { bg:'rgba(244,185,66,0.12)', color:'#f4b942' },
    driver:   { bg:'rgba(55,138,221,0.12)', color:'#378ADD' },
    customer: { bg:'rgba(255,255,255,0.06)',color:'rgba(255,255,255,0.4)' },
  }

  const inp = { fontSize:'13px', padding:'9px 10px', backgroundColor:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'5px', color:'#f0ede6', outline:'none', fontFamily:'inherit', flex:1 }

  return (
    <div style={{padding:'20px'}}>
      <h1 style={{fontSize:'20px', fontWeight:'500', marginBottom:'4px'}}>Users</h1>
      <p style={{fontSize:'12px', color:'rgba(255,255,255,0.4)', marginBottom:'20px'}}>Manage users, reset passwords and deactivate accounts</p>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px', color:'rgba(255,255,255,0.3)'}}>Loading...</div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
          {users.map(u => {
            const rc = roleColors[u.role] ?? roleColors.customer
            const isResetting = showReset === u.id
            const msg = message[u.id]
            const isActive = u.is_active !== false
            return (
              <div key={u.id} style={{backgroundColor: isActive ? 'rgba(255,255,255,0.04)' : 'rgba(162,45,45,0.06)', border:`1px solid ${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(162,45,45,0.2)'}`, borderRadius:'8px', padding:'14px 16px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px'}}>
                      <div style={{fontSize:'14px', fontWeight:'500'}}>{u.full_name || '—'}</div>
                      {!isActive && <span style={{fontSize:'10px', padding:'2px 6px', borderRadius:'6px', backgroundColor:'rgba(162,45,45,0.2)', color:'#f09595'}}>Deactivated</span>}
                    </div>
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{u.email}</div>
                  </div>
                  <div style={{display:'flex', alignItems:'center', gap:'8px', flexShrink:0, flexWrap:'wrap'}}>
                    <span style={{fontSize:'10px', padding:'2px 8px', borderRadius:'8px', backgroundColor:rc.bg, color:rc.color, fontWeight:'500', textTransform:'capitalize'}}>{u.role}</span>
                    <button
                      onClick={() => setShowReset(isResetting ? null : u.id)}
                      style={{padding:'5px 12px', background:'none', border:'1px solid rgba(244,185,66,0.4)', borderRadius:'4px', color:'#f4b942', fontSize:'11px', cursor:'pointer', fontFamily:'inherit'}}
                    >
                      {isResetting ? 'Cancel' : '🔑 Set password'}
                    </button>
                    <button
                      onClick={() => toggleActive(u.id, isActive)}
                      disabled={toggling === u.id}
                      style={{padding:'5px 12px', background:'none', border:`1px solid ${isActive ? 'rgba(162,45,45,0.4)' : 'rgba(29,158,117,0.4)'}`, borderRadius:'4px', color: isActive ? '#f09595' : '#1D9E75', fontSize:'11px', cursor:'pointer', fontFamily:'inherit'}}
                    >
                      {toggling === u.id ? '...' : isActive ? 'Deactivate' : 'Reactivate'}
                    </button>
                  </div>
                </div>

                {isResetting && (
                  <div style={{marginTop:'12px', paddingTop:'12px', borderTop:'1px solid rgba(255,255,255,0.06)'}}>
                    <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                      <input
                        type="text"
                        placeholder="New password (min. 8 characters)"
                        value={newPassword[u.id] || ''}
                        onChange={e => setNewPassword(p => ({...p, [u.id]: e.target.value}))}
                        onKeyDown={e => e.key === 'Enter' && resetPassword(u.id, u.email)}
                        style={inp}
                      />
                      <button
                        onClick={() => resetPassword(u.id, u.email)}
                        disabled={resetting === u.id}
                        style={{padding:'9px 16px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap'}}
                      >
                        {resetting === u.id ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                    {msg && (
                      <p style={{fontSize:'12px', color:msg.ok?'#1D9E75':'#f09595', marginTop:'6px', margin:'6px 0 0'}}>{msg.text}</p>
                    )}
                  </div>
                )}

                {msg && !isResetting && (
                  <p style={{fontSize:'12px', color:msg.ok?'#1D9E75':'#f09595', marginTop:'8px', margin:'8px 0 0'}}>{msg.text}</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}