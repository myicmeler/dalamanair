'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const sym = (c?: string) => (c === 'GBP' ? '£' : '€')

// Statuses that represent a live, upcoming transfer (not finished/cancelled).
const LIVE_STATUSES = ['pending_provider_confirmation', 'pending_customer_acknowledgement', 'confirmed', 'driver_assigned']

const statusLabel: Record<string, { label: string, color: string }> = {
  pending_provider_confirmation:    { label: 'Confirm',        color: '#f4b942' },
  pending_customer_acknowledgement: { label: 'Awaiting customer', color: '#378ADD' },
  confirmed:                        { label: 'Confirmed',      color: '#1D9E75' },
  driver_assigned:                  { label: 'Driver assigned', color: '#378ADD' },
}

export default function ProviderDashboard() {
  const router = useRouter()
  const supabase = createClient() as any
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [provider, setProvider] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [newQuotes, setNewQuotes] = useState(0)
  const [fleet, setFleet] = useState({ vehicles: 0, drivers: 0 })

  useEffect(() => {
    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { router.push('/auth/signin?redirect=/provider'); return }

        const { data: prov, error: provErr } = await supabase
          .from('providers')
          .select('id, company_name, avg_rating, total_reviews, is_approved')
          .eq('user_id', user.id).single()
        if (provErr || !prov) {
          setError('Provider account not found. Make sure your account is approved.')
          setLoading(false)
          return
        }
        setProvider(prov)

        // Bookings for this provider (schedule + action state computed below).
        const { data: bks } = await supabase.from('bookings')
          .select('id, status, pickup_time, driver_id, final_price, currency, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
          .eq('provider_id', prov.id)
          .order('pickup_time', { ascending: true })
        setBookings(bks ?? [])

        // Active fleet counts (head-only, no rows transferred).
        const [{ count: vehCount }, { count: drvCount }] = await Promise.all([
          supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('provider_id', prov.id).eq('is_active', true),
          supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('provider_id', prov.id).eq('is_active', true),
        ])
        setFleet({ vehicles: vehCount ?? 0, drivers: drvCount ?? 0 })

        // Open quote requests this provider has neither offered on nor declined
        // (same rule as the layout badge).
        const { data: openReqs } = await supabase.from('quote_requests')
          .select('id').eq('status', 'open').gt('expires_at', new Date().toISOString())
        if (openReqs && openReqs.length > 0) {
          const ids = openReqs.map((r: any) => r.id)
          const [{ data: myOffers }, { data: myDeclines }] = await Promise.all([
            supabase.from('quote_offers').select('request_id').eq('provider_id', prov.id).in('request_id', ids),
            supabase.from('quote_declines').select('request_id').eq('provider_id', prov.id).in('request_id', ids),
          ])
          const handled = new Set([
            ...(myOffers ?? []).map((o: any) => o.request_id),
            ...(myDeclines ?? []).map((d: any) => d.request_id),
          ])
          setNewQuotes(openReqs.filter((r: any) => !handled.has(r.id)).length)
        } else {
          setNewQuotes(0)
        }
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const now = Date.now()
  const needsConfirm = bookings.filter(b => b.status === 'pending_provider_confirmation').length
  const needsDriver = bookings.filter(b => (b.status === 'confirmed' || b.status === 'pending_customer_acknowledgement') && !b.driver_id).length
  const upcoming = bookings.filter(b => LIVE_STATUSES.includes(b.status) && new Date(b.pickup_time).getTime() >= now).slice(0, 5)
  const totalBookings = bookings.length

  const greeting = (() => {
    const h = new Date().getHours()
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  })()

  const card: React.CSSProperties = { backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '16px' }

  function ActionCard({ href, count, label, accent }: { href: string, count: number, label: string, accent: string }) {
    return (
      <Link href={href} style={{ ...card, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textDecoration: 'none', color: '#f0ede6', borderColor: `${accent}55`, backgroundColor: `${accent}12` }}>
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: '20px', fontWeight: 700, color: accent }}>{count} →</span>
      </Link>
    )
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.3)' }}>Loading...</div>
  }
  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ backgroundColor: 'rgba(162,45,45,0.15)', border: '1px solid rgba(162,45,45,0.3)', borderRadius: '8px', padding: '20px', color: '#f09595', fontSize: '14px' }}>{error}</div>
      </div>
    )
  }

  const hasActions = needsConfirm > 0 || needsDriver > 0 || newQuotes > 0

  return (
    <div style={{ padding: '20px' }}>
      <p style={{ fontSize: '11px', letterSpacing: '0.2em', color: '#f4b942', textTransform: 'uppercase', marginBottom: '6px' }}>{greeting}</p>
      <h1 style={{ fontSize: 'clamp(20px,5vw,24px)', fontWeight: 500, marginBottom: '16px' }}>{provider.company_name}</h1>

      {!provider.is_approved && (
        <div style={{ backgroundColor: 'rgba(239,159,39,0.1)', border: '1px solid rgba(239,159,39,0.3)', borderRadius: '8px', padding: '14px', marginBottom: '16px', fontSize: '13px', color: '#EF9F27', lineHeight: 1.5 }}>
          Your account is pending approval. You will start receiving quote requests once an admin approves you.
        </div>
      )}

      {/* Action items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {newQuotes > 0 && <ActionCard href="/provider/quotes" count={newQuotes} label={`New quote request${newQuotes > 1 ? 's' : ''} to answer`} accent="#f4b942" />}
        {needsConfirm > 0 && <ActionCard href="/provider/bookings" count={needsConfirm} label={`Booking${needsConfirm > 1 ? 's' : ''} awaiting your confirmation`} accent="#f4b942" />}
        {needsDriver > 0 && <ActionCard href="/provider/bookings" count={needsDriver} label={`Booking${needsDriver > 1 ? 's' : ''} needing a driver`} accent="#378ADD" />}
        {!hasActions && (
          <div style={{ ...card, textAlign: 'center', padding: '28px', color: 'rgba(255,255,255,0.4)' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.55)' }}>You're all caught up — nothing needs your attention right now.</p>
          </div>
        )}
      </div>

      {/* Upcoming transfers */}
      <h2 style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '10px' }}>Upcoming transfers</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
        {upcoming.length === 0 ? (
          <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.35)', fontSize: '13px', padding: '24px' }}>No upcoming transfers</div>
        ) : upcoming.map(b => {
          const dt = new Date(b.pickup_time)
          const s = statusLabel[b.status] ?? { label: b.status, color: 'rgba(255,255,255,0.4)' }
          return (
            <Link key={b.id} href="/provider/bookings" style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', textDecoration: 'none', color: '#f0ede6' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: 500, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.pickup?.name} → {b.dropoff?.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
                  {dt.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' })} · {dt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: '#f4b942', marginBottom: '4px' }}>{sym(b.currency)} {b.final_price?.toFixed(0)}</div>
                <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', backgroundColor: `${s.color}20`, color: s.color, fontWeight: 500 }}>{s.label}</span>
              </div>
            </Link>
          )
        })}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '20px' }}>
        {[
          { num: totalBookings, label: 'Total bookings' },
          { num: provider.total_reviews > 0 ? `${Number(provider.avg_rating).toFixed(1)}★` : '—', label: `Rating · ${provider.total_reviews} review${provider.total_reviews === 1 ? '' : 's'}` },
          { num: fleet.vehicles, label: 'Active vehicles' },
          { num: fleet.drivers, label: 'Active drivers' },
        ].map(s => (
          <div key={s.label} style={card}>
            <div style={{ fontSize: '22px', fontWeight: 500, marginBottom: '4px' }}>{s.num}</div>
            <div style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[
          { href: '/provider/prices', label: 'Default prices' },
          { href: '/provider/log-transfers', label: 'Log a transfer' },
          { href: '/provider/vehicles', label: 'Manage fleet' },
          { href: '/provider/drivers', label: 'Manage drivers' },
        ].map(l => (
          <Link key={l.href} href={l.href} style={{ ...card, padding: '10px 14px', fontSize: '12px', color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{l.label} →</Link>
        ))}
      </div>
    </div>
  )
}
