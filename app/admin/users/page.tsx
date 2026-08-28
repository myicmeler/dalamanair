'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

// Numbers are stored E.164 (+447700900123). wa.me wants digits only, no plus.
const waDigits = (p?: string) => (p ?? '').replace(/[^0-9]/g, '')

export default function AdminUsers() {
  const supabase = createClient() as any
  const [users, setUsers] = useState<any[]>([])
  const [reqPhones, setReqPhones] = useState<Record<string,string>>({})
  const [loading, setLoading] = useState(true)
  const [resetting, setResetting] = useState<string|null>(null)
  const [newPassword, setNewPassword] = useState<Record<string,string>>({})
  const [showReset, setShowReset] = useState<string|null>(null)
  const [message, setMessage] = useState<Record<string,{text:string,ok:boolean}>>({})
  const [toggling, setToggling] = useState<string|null>(null)
  const [currentUserId, setCurrentUserId] = useState('')
  const [showPurge, setShowPurge] = useState<string|null>(null)
  const [purgeText, setPurgeText] = useState<Record<string,string>>({})
  const [purging, setPurging] = useState<string|null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserId(user.id)
    const { data } = await supabase
      .from('users')
      .select('id, email, full_name, role, is_active, created_at, phone')
      .order('created_at', { ascending: false })
    if (data) setUsers(data)

    // Phone was optional at signup until 17 Aug 2026, so most customers have no
    // account phone — but the quote form has always captured a normalised one.
    // Fetched separately rather than as a nested select so a failure here can
    // never stop the user list rendering.
    const { data: reqs, error: reqErr } = await supabase
      .from('quote_requests')
      .select('customer_id, contact_phone, created_at')
      .not('contact_phone', 'is', null)
      .order('created_at', { ascending: false })
    if (reqErr) {
      console.error('Could not load quote-request phones:', reqErr)
    } else if (reqs) {
      // Newest first, so the first one seen per customer is the most recent.
      const map: Record<string,string> = {}
      for (const r of reqs) {
        if (r.customer_id && !map[r.customer_id]) map[r.customer_id] = r.contact_phone
      }
      setReqPhones(map)
    }

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
      // Send the signed-in admin's access token — the edge function verifies
      // the caller is an admin. Never authenticate this call with the anon key.
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
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

  // Permanently delete a single user + all their data + auth account. Uses the
  // same delete-test-data edge function (admin-verified server-side) that the
  // Clean-up danger zone uses to purge by email pattern — here scoped to one id.
  async function purgeUser(userId: string, email: string) {
    setPurging(userId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-test-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ userIds: [userId], deleteAuth: true }),
      })
      const result = await res.json()
      if (!res.ok || result.error) throw new Error(result.error || 'Purge failed')
      setUsers(prev => prev.filter(u => u.id !== userId))
      setShowPurge(null)
      setPurgeText(p => ({ ...p, [userId]: '' }))
    } catch (err: any) {
      setMessage(p => ({ ...p, [userId]: { text: err.message, ok: false } }))
    }
    setPurging(null)
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
            // Account phone first, then the most recent quote-request phone.
            const phone = u.phone || reqPhones[u.id] || ''
            const fromRequest = !u.phone && !!reqPhones[u.id]
            const wa = waDigits(phone)
            return (
              <div key={u.id} style={{backgroundColor: isActive ? 'rgba(255,255,255,0.04)' : 'rgba(162,45,45,0.06)', border:`1px solid ${isActive ? 'rgba(255,255,255,0.08)' : 'rgba(162,45,45,0.2)'}`, borderRadius:'8px', padding:'14px 16px'}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:'12px', flexWrap:'wrap'}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:'flex', alignItems:'center', gap:'8px', marginBottom:'2px'}}>
                      <div style={{fontSize:'14px', fontWeight:'500'}}>{u.full_name || '—'}</div>
                      {!isActive && <span style={{fontSize:'10px', padding:'2px 6px', borderRadius:'6px', backgroundColor:'rgba(162,45,45,0.2)', color:'#f09595'}}>Deactivated</span>}
                    </div>
                    <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{u.email}</div>
                    {phone ? (
                      <div style={{display:'flex', alignItems:'center', gap:'10px', marginTop:'4px', flexWrap:'wrap'}}>
                        <a href={`tel:${phone}`} style={{fontSize:'13px', fontWeight:'600', color:'rgba(255,255,255,0.75)', textDecoration:'none'}}>
                          📞 {phone}
                        </a>
                        <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer"
                          style={{display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:'600', padding:'3px 9px', borderRadius:'10px', backgroundColor:'rgba(37,211,102,0.12)', border:'1px solid rgba(37,211,102,0.35)', color:'#25D366', textDecoration:'none'}}>
                          WhatsApp →
                        </a>
                        {fromRequest && (
                          <span title="Taken from their most recent quote request, not their account"
                            style={{fontSize:'10px', color:'rgba(255,255,255,0.3)'}}>from quote</span>
                        )}
                      </div>
                    ) : (
                      <div style={{fontSize:'12px', color:'rgba(255,255,255,0.25)', marginTop:'4px'}}>📞 N/A</div>
                    )}
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
                    {u.id !== currentUserId && (
                      <button
                        onClick={() => { setShowReset(null); setShowPurge(showPurge === u.id ? null : u.id); setPurgeText(p => ({...p, [u.id]: ''})) }}
                        style={{padding:'5px 12px', background:'none', border:'1px solid rgba(162,45,45,0.6)', borderRadius:'4px', color:'#f09595', fontSize:'11px', cursor:'pointer', fontFamily:'inherit'}}
                      >
                        {showPurge === u.id ? 'Cancel' : '🗑 Purge'}
                      </button>
                    )}
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

                {showPurge === u.id && (
                  <div style={{marginTop:'12px', paddingTop:'12px', borderTop:'1px solid rgba(162,45,45,0.25)'}}>
                    <p style={{fontSize:'12px', color:'#f09595', margin:'0 0 8px', lineHeight:'1.5'}}>
                      Permanently delete <strong>{u.email}</strong> — their profile, login and all their data (bookings, quotes, reviews). This cannot be undone. Type <strong>DELETE</strong> to confirm.
                    </p>
                    <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                      <input
                        type="text"
                        placeholder="DELETE"
                        value={purgeText[u.id] || ''}
                        onChange={e => setPurgeText(p => ({...p, [u.id]: e.target.value}))}
                        onKeyDown={e => e.key === 'Enter' && purgeText[u.id] === 'DELETE' && purgeUser(u.id, u.email)}
                        style={{...inp, borderColor: purgeText[u.id] === 'DELETE' ? '#a32d2d' : 'rgba(255,255,255,0.15)'}}
                      />
                      <button
                        onClick={() => purgeUser(u.id, u.email)}
                        disabled={purgeText[u.id] !== 'DELETE' || purging === u.id}
                        style={{padding:'9px 16px', backgroundColor: purgeText[u.id] === 'DELETE' ? '#a32d2d' : 'rgba(162,45,45,0.3)', color:'#ffffff', border:'none', borderRadius:'5px', fontSize:'12px', fontWeight:'600', cursor: purgeText[u.id] === 'DELETE' ? 'pointer' : 'not-allowed', fontFamily:'inherit', whiteSpace:'nowrap'}}
                      >
                        {purging === u.id ? 'Purging...' : 'Purge permanently'}
                      </button>
                    </div>
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
