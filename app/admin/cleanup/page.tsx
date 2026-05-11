'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminCleanup() {
  const supabase = createClient() as any
  const [emailPattern, setEmailPattern] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [statusFilter, setStatusFilter] = useState<string[]>([])
  const [preview, setPreview] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [deleteRequests, setDeleteRequests] = useState(false)
  const [deleteBookings, setDeleteBookings] = useState(false)
  const [deleteUsers, setDeleteUsers] = useState(false)
  const [deleteAuth, setDeleteAuth] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState<any>(null)

  function toggleStatus(status: string) {
    setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status])
  }

  async function runPreview() {
    setLoading(true)
    setPreview(null)
    setResult(null)
    try {
      // Build user filter — find matching user IDs by email pattern
      let matchingUserIds: string[] = []
      if (emailPattern.trim()) {
        const pattern = emailPattern.replace(/\*/g, '%')
        const { data: matchedUsers } = await supabase.from('users').select('id, email').ilike('email', pattern)
        matchingUserIds = (matchedUsers ?? []).map((u: any) => u.id)
        setPreview((p: any) => ({ ...p, users: matchedUsers || [] }))
      }

      // Quote requests
      let reqQuery = supabase.from('quote_requests')
        .select(`id, status, pickup_time, created_at, customer:users!customer_id(email),
          pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)`)
      if (matchingUserIds.length > 0) reqQuery = reqQuery.in('customer_id', matchingUserIds)
      if (dateFrom) reqQuery = reqQuery.gte('created_at', dateFrom)
      if (dateTo) reqQuery = reqQuery.lte('created_at', dateTo + 'T23:59:59')
      if (statusFilter.length > 0) reqQuery = reqQuery.in('status', statusFilter)
      const { data: requests } = await reqQuery.limit(100)

      // Bookings
      let bookQuery = supabase.from('bookings')
        .select(`id, status, pickup_time, created_at, customer:users!customer_id(email),
          pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)`)
      if (matchingUserIds.length > 0) bookQuery = bookQuery.in('customer_id', matchingUserIds)
      if (dateFrom) bookQuery = bookQuery.gte('created_at', dateFrom)
      if (dateTo) bookQuery = bookQuery.lte('created_at', dateTo + 'T23:59:59')
      const { data: bookings } = await bookQuery.limit(100)

      setPreview({
        users: preview?.users || [],
        requests: requests || [],
        bookings: bookings || [],
        matchingUserIds,
      })
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  async function executeDelete() {
    setDeleting(true)
    setResult(null)
    try {
      const r: any = { requests: 0, bookings: 0, users: 0, authUsers: 0 }

      if (deleteRequests && preview?.requests?.length > 0) {
        const ids = preview.requests.map((x: any) => x.id)
        const { count } = await supabase.from('quote_requests').delete({ count: 'exact' }).in('id', ids)
        r.requests = count ?? 0
      }

      if (deleteBookings && preview?.bookings?.length > 0) {
        const ids = preview.bookings.map((x: any) => x.id)
        const { count } = await supabase.from('bookings').delete({ count: 'exact' }).in('id', ids)
        r.bookings = count ?? 0
      }

      if (deleteUsers && preview?.users?.length > 0) {
        const ids = preview.users.map((x: any) => x.id)
        const { data: { session } } = await supabase.auth.getSession()
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-test-data`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
          body: JSON.stringify({ userIds: ids, deleteAuth }),
        })
        const data = await res.json()
        r.users = data.deletedUsers || 0
        r.authUsers = data.deletedAuth || 0
      }

      setResult(r)
      setPreview(null)
      setShowConfirm(false)
      setConfirmText('')
    } catch (err) { console.error(err) }
    setDeleting(false)
  }

  const hasAnythingToDelete = (deleteRequests && preview?.requests?.length > 0) ||
                              (deleteBookings && preview?.bookings?.length > 0) ||
                              (deleteUsers && preview?.users?.length > 0)

  const inp: React.CSSProperties = { width:'100%', fontSize:'14px', padding:'10px', background:'rgba(255,255,255,0.07)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'#ffffff', boxSizing:'border-box', fontFamily:'inherit' }
  const lbl: React.CSSProperties = { fontSize:'11px', letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'6px' }
  const card: React.CSSProperties = { backgroundColor:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:'8px', padding:'16px', marginBottom:'12px' }

  return (
    <div style={{padding:'20px', maxWidth:'960px', margin:'0 auto'}}>
      <div style={{marginBottom:'8px'}}>
        <p style={{fontSize:'11px', letterSpacing:'0.2em', color:'#a32d2d', textTransform:'uppercase', marginBottom:'4px'}}>⚠️ Danger zone</p>
        <h1 style={{fontSize:'22px', fontWeight:'500', color:'#ffffff', marginBottom:'4px'}}>Clean up test data</h1>
        <p style={{fontSize:'13px', color:'rgba(255,255,255,0.5)', marginBottom:'20px'}}>Bulk delete quote requests, bookings, and users. Use with care.</p>
      </div>

      <div style={card}>
        <h2 style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', marginBottom:'14px'}}>1. Filter what to find</h2>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px'}}>
          <div>
            <label style={lbl}>Email pattern</label>
            <input value={emailPattern} onChange={e => setEmailPattern(e.target.value)} placeholder="e.g. thenri66+* or *test*" style={inp} />
            <p style={{fontSize:'11px', color:'rgba(255,255,255,0.3)', marginTop:'4px'}}>Use * as wildcard. Leave empty to match all users.</p>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'14px'}}>
          <div><label style={lbl}>Created from</label><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} /></div>
          <div><label style={lbl}>Created to</label><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} /></div>
        </div>
        <div>
          <label style={lbl}>Quote request status (leave empty for all)</label>
          <div style={{display:'flex', gap:'8px', flexWrap:'wrap'}}>
            {['open','accepted','expired','cancelled'].map(s => (
              <button key={s} onClick={() => toggleStatus(s)} style={{
                padding:'7px 14px', borderRadius:'14px',
                border:'1px solid '+(statusFilter.includes(s)?'#f4b942':'rgba(255,255,255,0.15)'),
                background:'none', fontSize:'11px', cursor:'pointer', fontFamily:'inherit',
                color:statusFilter.includes(s)?'#f4b942':'rgba(255,255,255,0.4)',
                textTransform:'capitalize',
              }}>{s}</button>
            ))}
          </div>
        </div>
        <button onClick={runPreview} disabled={loading}
          style={{marginTop:'16px', padding:'11px 22px', backgroundColor:'#f4b942', color:'#0f1419', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:'pointer', fontFamily:'inherit', letterSpacing:'0.05em', textTransform:'uppercase'}}>
          {loading ? 'Searching...' : 'Run preview'}
        </button>
      </div>

      {preview && (
        <>
          <div style={card}>
            <h2 style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', marginBottom:'14px'}}>2. Preview matches</h2>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'10px', marginBottom:'16px'}}>
              <div style={{background:'rgba(255,255,255,0.04)', padding:'14px', borderRadius:'6px', textAlign:'center'}}>
                <div style={{fontSize:'24px', fontWeight:'600', color:'#f4b942', marginBottom:'4px'}}>{preview.requests?.length || 0}</div>
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Quote requests</div>
              </div>
              <div style={{background:'rgba(255,255,255,0.04)', padding:'14px', borderRadius:'6px', textAlign:'center'}}>
                <div style={{fontSize:'24px', fontWeight:'600', color:'#f4b942', marginBottom:'4px'}}>{preview.bookings?.length || 0}</div>
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Bookings</div>
              </div>
              <div style={{background:'rgba(255,255,255,0.04)', padding:'14px', borderRadius:'6px', textAlign:'center'}}>
                <div style={{fontSize:'24px', fontWeight:'600', color:'#f4b942', marginBottom:'4px'}}>{preview.users?.length || 0}</div>
                <div style={{fontSize:'11px', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.05em'}}>Users</div>
              </div>
            </div>
            {preview.requests?.length > 0 && (
              <details style={{marginBottom:'10px'}}>
                <summary style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', cursor:'pointer', padding:'6px 0'}}>Show quote requests ({preview.requests.length})</summary>
                <div style={{marginTop:'8px', maxHeight:'200px', overflow:'auto', fontSize:'12px', color:'rgba(255,255,255,0.5)', padding:'8px 12px', background:'rgba(0,0,0,0.2)', borderRadius:'4px'}}>
                  {preview.requests.map((r: any) => (
                    <div key={r.id} style={{padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      {r.pickup?.name} → {r.dropoff?.name} · {new Date(r.created_at).toLocaleDateString('en-GB')} · {r.status} · {r.customer?.email}
                    </div>
                  ))}
                </div>
              </details>
            )}
            {preview.bookings?.length > 0 && (
              <details style={{marginBottom:'10px'}}>
                <summary style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', cursor:'pointer', padding:'6px 0'}}>Show bookings ({preview.bookings.length})</summary>
                <div style={{marginTop:'8px', maxHeight:'200px', overflow:'auto', fontSize:'12px', color:'rgba(255,255,255,0.5)', padding:'8px 12px', background:'rgba(0,0,0,0.2)', borderRadius:'4px'}}>
                  {preview.bookings.map((b: any) => (
                    <div key={b.id} style={{padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>
                      {b.pickup?.name} → {b.dropoff?.name} · {new Date(b.created_at).toLocaleDateString('en-GB')} · {b.status} · {b.customer?.email}
                    </div>
                  ))}
                </div>
              </details>
            )}
            {preview.users?.length > 0 && (
              <details>
                <summary style={{fontSize:'12px', color:'rgba(255,255,255,0.6)', cursor:'pointer', padding:'6px 0'}}>Show users ({preview.users.length})</summary>
                <div style={{marginTop:'8px', maxHeight:'200px', overflow:'auto', fontSize:'12px', color:'rgba(255,255,255,0.5)', padding:'8px 12px', background:'rgba(0,0,0,0.2)', borderRadius:'4px'}}>
                  {preview.users.map((u: any) => <div key={u.id} style={{padding:'4px 0', borderBottom:'1px solid rgba(255,255,255,0.04)'}}>{u.email}</div>)}
                </div>
              </details>
            )}
          </div>

          <div style={card}>
            <h2 style={{fontSize:'13px', fontWeight:'500', color:'#ffffff', marginBottom:'14px'}}>3. Choose what to delete</h2>
            {[
              {key:'deleteRequests', label:'Delete quote requests', count: preview.requests?.length || 0, sub:'cascades to offers, history, declines', state: deleteRequests, setter: setDeleteRequests},
              {key:'deleteBookings', label:'Delete bookings', count: preview.bookings?.length || 0, sub:'cascades to booking history, notifications', state: deleteBookings, setter: setDeleteBookings},
              {key:'deleteUsers', label:'Delete users (profiles)', count: preview.users?.length || 0, sub:'cascades to all their data', state: deleteUsers, setter: setDeleteUsers},
            ].map(o => (
              <label key={o.key} style={{display:'flex', alignItems:'flex-start', gap:'12px', padding:'10px 0', cursor:o.count>0?'pointer':'not-allowed', opacity:o.count>0?1:0.4}}>
                <input type="checkbox" checked={o.state} disabled={o.count===0} onChange={e => o.setter(e.target.checked)} style={{marginTop:'3px', width:'18px', height:'18px', accentColor:'#f4b942'}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:'14px', color:'#ffffff', fontWeight:'500'}}>{o.label} ({o.count})</div>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>{o.sub}</div>
                </div>
              </label>
            ))}
            {deleteUsers && (
              <label style={{display:'flex', alignItems:'flex-start', gap:'12px', padding:'10px 0 10px 28px', cursor:'pointer', marginTop:'4px'}}>
                <input type="checkbox" checked={deleteAuth} onChange={e => setDeleteAuth(e.target.checked)} style={{marginTop:'3px', width:'18px', height:'18px', accentColor:'#a32d2d'}} />
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px', color:'#f09595', fontWeight:'500'}}>Also delete auth accounts (Yes/No)</div>
                  <div style={{fontSize:'12px', color:'rgba(255,255,255,0.4)'}}>Permanently removes the auth user so the email can be reused for signup</div>
                </div>
              </label>
            )}
            <button onClick={() => setShowConfirm(true)} disabled={!hasAnythingToDelete}
              style={{marginTop:'16px', padding:'12px 22px', backgroundColor:hasAnythingToDelete?'#a32d2d':'rgba(162,45,45,0.3)', color:'#ffffff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:hasAnythingToDelete?'pointer':'not-allowed', fontFamily:'inherit', letterSpacing:'0.05em', textTransform:'uppercase'}}>
              Continue to confirmation
            </button>
          </div>
        </>
      )}

      {result && (
        <div style={{...card, borderColor:'rgba(29,158,117,0.4)', background:'rgba(29,158,117,0.08)'}}>
          <p style={{fontSize:'14px', fontWeight:'500', color:'#1D9E75', marginBottom:'8px'}}>✓ Cleanup complete</p>
          <ul style={{fontSize:'13px', color:'rgba(255,255,255,0.7)', margin:0, paddingLeft:'20px'}}>
            <li>Deleted {result.requests} quote requests</li>
            <li>Deleted {result.bookings} bookings</li>
            <li>Deleted {result.users} users (profiles)</li>
            {deleteAuth && <li>Deleted {result.authUsers} auth accounts</li>}
          </ul>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, backgroundColor:'rgba(0,0,0,0.8)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px', zIndex:100}}>
          <div style={{backgroundColor:'#1a1f26', border:'1px solid rgba(162,45,45,0.4)', borderRadius:'10px', padding:'24px', maxWidth:'440px', width:'100%'}}>
            <p style={{fontSize:'12px', color:'#a32d2d', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:'6px'}}>⚠️ This cannot be undone</p>
            <h3 style={{fontSize:'18px', fontWeight:'500', color:'#ffffff', marginBottom:'12px'}}>Confirm deletion</h3>
            <p style={{fontSize:'13px', color:'rgba(255,255,255,0.6)', marginBottom:'12px', lineHeight:'1.6'}}>
              You are about to delete:
            </p>
            <ul style={{fontSize:'13px', color:'#ffffff', margin:'0 0 16px', paddingLeft:'20px'}}>
              {deleteRequests && preview?.requests?.length > 0 && <li>{preview.requests.length} quote requests</li>}
              {deleteBookings && preview?.bookings?.length > 0 && <li>{preview.bookings.length} bookings</li>}
              {deleteUsers && preview?.users?.length > 0 && <li>{preview.users.length} users{deleteAuth && ' (including auth accounts)'}</li>}
            </ul>
            <label style={{fontSize:'11px', color:'rgba(255,255,255,0.5)', display:'block', marginBottom:'5px'}}>Type DELETE to confirm:</label>
            <input value={confirmText} onChange={e => setConfirmText(e.target.value)} placeholder="DELETE" style={{...inp, marginBottom:'14px'}} />
            <div style={{display:'flex', gap:'10px'}}>
              <button onClick={() => { setShowConfirm(false); setConfirmText('') }} style={{flex:1, padding:'11px', background:'none', border:'1px solid rgba(255,255,255,0.15)', borderRadius:'6px', color:'rgba(255,255,255,0.6)', fontSize:'13px', cursor:'pointer', fontFamily:'inherit'}}>Cancel</button>
              <button onClick={executeDelete} disabled={confirmText!=='DELETE' || deleting}
                style={{flex:1, padding:'11px', backgroundColor:confirmText==='DELETE'?'#a32d2d':'rgba(162,45,45,0.3)', color:'#ffffff', border:'none', borderRadius:'6px', fontSize:'13px', fontWeight:'600', cursor:confirmText==='DELETE'?'pointer':'not-allowed', fontFamily:'inherit'}}>
                {deleting ? 'Deleting...' : 'Delete now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
