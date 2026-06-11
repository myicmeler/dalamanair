'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const STATUS_COLORS: Record<string, { bg: string, color: string }> = {
  delivered:  { bg: 'rgba(29,158,117,0.12)',  color: '#1D9E75' },
  accepted:   { bg: 'rgba(244,185,66,0.12)',  color: '#f4b942' },
  failed:     { bg: 'rgba(162,45,45,0.12)',   color: '#f09595' },
  bounced:    { bg: 'rgba(162,45,45,0.12)',   color: '#f09595' },
  opened:     { bg: 'rgba(100,149,237,0.12)', color: '#6495ED' },
  clicked:    { bg: 'rgba(100,149,237,0.12)', color: '#6495ED' },
  complained: { bg: 'rgba(255,165,0,0.12)',   color: '#FFA500' },
  unsubscribed: { bg: 'rgba(255,165,0,0.12)', color: '#FFA500' },
}

export default function AdminEmails() {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [nextPage, setNextPage] = useState<string | null>(null)
  const [prevPages, setPrevPages] = useState<string[]>([])

  async function fetchLogs(page?: string) {
    setLoading(true)
    setError('')
    try {
      let url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-email-logs?limit=25`
      if (filter) url += `&event=${filter}`
      if (page) url += `&page=${page}`

      // Email logs contain customer PII — authenticate as the signed-in admin
      // (token), never the public anon key. The function enforces admin-only.
      const { data: { session } } = await createClient().auth.getSession()
      const res = await fetch(url, {
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
        }
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }

      setEvents(data.items ?? [])

      // Extract next page token from paging URLs
      const nextUrl = data.paging?.next
      if (nextUrl) {
        const match = nextUrl.match(/page=([^&]+)/)
        setNextPage(match ? match[1] : null)
      } else {
        setNextPage(null)
      }
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  useEffect(() => { fetchLogs() }, [filter])

  function handleNext() {
    if (!nextPage) return
    setPrevPages(p => [...p, ''])
    fetchLogs(nextPage)
  }

  function handlePrev() {
    const pages = [...prevPages]
    pages.pop()
    setPrevPages(pages)
    fetchLogs(pages[pages.length - 1] ?? undefined)
  }

  function formatDate(ts: number) {
    return new Date(ts * 1000).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const card: React.CSSProperties = { backgroundColor: '#1a1f26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }
  const inp: React.CSSProperties = { fontSize: '13px', padding: '8px 12px', backgroundColor: '#1e2530', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#f0ede6', outline: 'none', colorScheme: 'dark' as any }

  return (
    <div style={{ padding: '24px 20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '4px' }}>Admin</p>
        <h1 style={{ fontSize: '22px', fontWeight: '500', color: '#ffffff', marginBottom: '4px' }}>Email Log</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Outgoing emails via Mailgun — last 25 events</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={filter} onChange={e => { setFilter(e.target.value); setPrevPages([]) }} style={{ ...inp, minWidth: '160px' }}>
          <option value="">All events</option>
          <option value="accepted">Accepted</option>
          <option value="delivered">Delivered</option>
          <option value="failed">Failed</option>
          <option value="bounced">Bounced</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="complained">Complained</option>
          <option value="unsubscribed">Unsubscribed</option>
        </select>
        <button onClick={() => fetchLogs()} style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', cursor: 'pointer' }}>
          ↻ Refresh
        </button>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>}

      {!loading && error && (
        <div style={{ backgroundColor: 'rgba(162,45,45,0.15)', border: '1px solid rgba(162,45,45,0.3)', borderRadius: '8px', padding: '16px', color: '#f09595', fontSize: '13px' }}>
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div style={{ ...card, padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          No email events found
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <div style={card}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 90px', gap: '12px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
            <div>Date / Time</div>
            <div>Recipient</div>
            <div>Subject</div>
            <div>Status</div>
          </div>

          {events.map((evt: any, i: number) => {
            const status = evt.event ?? 'unknown'
            const sc = STATUS_COLORS[status] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }
            const recipient = evt.recipient ?? evt.envelope?.targets ?? '—'
            const subject = evt.message?.headers?.subject ?? '—'

            return (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '160px 1fr 1fr 90px', gap: '12px',
                padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                fontSize: '12px', alignItems: 'center'
              }}>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                  {formatDate(evt.timestamp)}
                </div>
                <div style={{ color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {recipient}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subject}
                </div>
                <div>
                  <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '10px', backgroundColor: sc.bg, color: sc.color, fontWeight: '500', textTransform: 'capitalize' }}>
                    {status}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && (prevPages.length > 0 || nextPage) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
          <button onClick={handlePrev} disabled={prevPages.length === 0}
            style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: prevPages.length === 0 ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', fontSize: '12px', cursor: prevPages.length === 0 ? 'not-allowed' : 'pointer' }}>
            ← Previous
          </button>
          <button onClick={handleNext} disabled={!nextPage}
            style={{ padding: '8px 16px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: !nextPage ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)', fontSize: '12px', cursor: !nextPage ? 'not-allowed' : 'pointer' }}>
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
