'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  delivered:    { bg: 'rgba(29,158,117,0.12)',  color: '#1D9E75' },
  accepted:     { bg: 'rgba(244,185,66,0.12)',  color: '#f4b942' },
  failed:       { bg: 'rgba(162,45,45,0.15)',   color: '#f09595' },
  rejected:     { bg: 'rgba(162,45,45,0.15)',   color: '#f09595' },
  opened:       { bg: 'rgba(55,138,221,0.12)',  color: '#378ADD' },
  clicked:      { bg: 'rgba(55,138,221,0.12)',  color: '#378ADD' },
  complained:   { bg: 'rgba(255,165,0,0.12)',   color: '#FFA500' },
  unsubscribed: { bg: 'rgba(255,165,0,0.12)',   color: '#FFA500' },
}

const PAGE_SIZE = 50

export default function AdminEmails() {
  const supabase = createClient() as any
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Mailgun pages by handing back complete next/previous URLs with an opaque
  // token in the path — there is no page number and no total count. So the only
  // way to know you have reached the end is to press Next and get nothing back.
  const [paging, setPaging] = useState<{ next?: string; previous?: string }>({})
  const [pageNo, setPageNo] = useState(1)
  const [atEnd, setAtEnd] = useState(false)

  useEffect(() => { fetchLogs() }, [filter])

  async function fetchLogs(opts?: { pageUrl?: string; direction?: 'next' | 'prev' }) {
    setLoading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      let url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/get-email-logs?limit=${PAGE_SIZE}`

      if (opts?.pageUrl) {
        // Paging: send Mailgun's own URL back verbatim. Filters and dates are
        // already baked into that token, so they must not be re-sent.
        url += `&next=${encodeURIComponent(opts.pageUrl)}`
      } else {
        if (filter) url += `&event=${filter}`
        // Mailgun wants Unix seconds. `to` covers the whole day chosen, so add
        // a day and step back a second — otherwise picking today returns
        // nothing sent after midnight.
        if (fromDate) url += `&begin=${Math.floor(new Date(`${fromDate}T00:00:00Z`).getTime() / 1000)}`
        if (toDate)   url += `&end=${Math.floor(new Date(`${toDate}T00:00:00Z`).getTime() / 1000) + 86399}`
      }

      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session?.access_token ?? ''}`,
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)

      const items = data.items ?? []

      // An empty page means we walked past the end. Keep the previous page on
      // screen rather than showing a blank table, and stop offering Next.
      if (opts?.direction === 'next' && items.length === 0) {
        setAtEnd(true)
        setLoading(false)
        return
      }

      setEvents(items)
      setPaging(data.paging ?? {})
      setAtEnd(items.length < PAGE_SIZE)

      if (opts?.direction === 'next') setPageNo(n => n + 1)
      else if (opts?.direction === 'prev') setPageNo(n => Math.max(1, n - 1))
      else setPageNo(1)
    } catch (err: any) {
      setError(err.message)
    }
    setLoading(false)
  }

  function applyDates() {
    setAtEnd(false)
    fetchLogs()
  }

  function clearDates() {
    setFromDate('')
    setToDate('')
    setAtEnd(false)
    // Passing no dates returns the most recent events.
    setTimeout(() => fetchLogs(), 0)
  }

  function fmtDate(ts: number) {
    const d = new Date(ts * 1000)
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      + ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  const card: React.CSSProperties = { backgroundColor: '#1a1f26', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }
  const inp: React.CSSProperties = { fontSize: '13px', padding: '8px 12px', backgroundColor: '#1e2530', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', color: '#f0ede6', outline: 'none', colorScheme: 'dark' as any }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }
  const btn = (enabled: boolean): React.CSSProperties => ({
    padding: '8px 16px', borderRadius: '6px', fontSize: '12px', fontFamily: 'inherit',
    background: 'none',
    border: `1px solid ${enabled ? 'rgba(244,185,66,0.4)' : 'rgba(255,255,255,0.08)'}`,
    color: enabled ? '#f4b942' : 'rgba(255,255,255,0.2)',
    cursor: enabled ? 'pointer' : 'not-allowed',
  })

  const canNext = !!paging.next && !atEnd
  const canPrev = !!paging.previous && pageNo > 1

  return (
    <div style={{ padding: '20px' }}>
      <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '6px' }}>Admin</p>
        <h1 style={{ fontSize: '24px', fontWeight: '500', color: '#ffffff', marginBottom: '4px' }}>Email Log</h1>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Outgoing emails via Mailgun — {PAGE_SIZE} per page</p>
      </div>

      {/* Filters */}
      <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <label style={lbl}>From</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>To</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} style={inp} />
          </div>
          <div>
            <label style={lbl}>Event</label>
            <select value={filter} onChange={e => { setAtEnd(false); setFilter(e.target.value) }} style={{ ...inp, minWidth: '150px' }}>
              <option value="">All events</option>
              <option value="delivered">Delivered</option>
              <option value="accepted">Accepted</option>
              <option value="failed">Failed</option>
              <option value="opened">Opened</option>
              <option value="clicked">Clicked</option>
              <option value="complained">Complained</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </div>
          <button onClick={applyDates} style={{ padding: '8px 16px', backgroundColor: '#f4b942', color: '#0f1419', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}>
            Search
          </button>
          {(fromDate || toDate) && (
            <button onClick={clearDates} style={{ padding: '8px 14px', background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px', color: 'rgba(255,255,255,0.5)', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Clear dates
            </button>
          )}
        </div>
        <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', margin: '10px 0 0', lineHeight: '1.5' }}>
          Mailgun keeps event data for a limited period — between 5 and 30 days depending on the plan. Older dates return nothing.
        </p>
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>}

      {!loading && error && (
        <div style={{ backgroundColor: 'rgba(162,45,45,0.15)', border: '1px solid rgba(162,45,45,0.3)', borderRadius: '8px', padding: '20px', color: '#f09595', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {!loading && !error && events.length === 0 && (
        <div style={{ ...card, padding: '48px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
          No email events found
        </div>
      )}

      {!loading && !error && events.length > 0 && (
        <>
          <div style={{ ...card, overflowX: 'auto' }}>
            <div style={{ minWidth: '600px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 90px', gap: '12px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)' }}>
                <div>Date / Time</div>
                <div>Recipient</div>
                <div>Subject</div>
                <div>Status</div>
              </div>

              {events.map((evt: any, i: number) => {
                const status = evt.event ?? 'unknown'
                const sc = STATUS_COLORS[status] ?? { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }
                return (
                  <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '160px 1fr 1fr 90px', gap: '12px',
                    padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)',
                    fontSize: '13px', alignItems: 'center',
                  }}>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '11px' }}>
                      {fmtDate(evt.timestamp)}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.recipient ?? '—'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {evt.message?.headers?.subject ?? '—'}
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
          </div>

          {/* Paging. Mailgun gives no total count, so there is no "page 2 of 3" —
              only Next and Previous, and Next is disabled once a short or empty
              page shows we have reached the end. */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '14px', flexWrap: 'wrap' }}>
            <button onClick={() => canPrev && fetchLogs({ pageUrl: paging.previous, direction: 'prev' })} disabled={!canPrev} style={btn(canPrev)}>
              ← Previous
            </button>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              Page {pageNo} · showing {events.length}
            </span>
            <button onClick={() => canNext && fetchLogs({ pageUrl: paging.next, direction: 'next' })} disabled={!canNext} style={btn(canNext)}>
              Next →
            </button>
          </div>
        </>
      )}
    </div>
  )
}
