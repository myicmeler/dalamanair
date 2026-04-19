'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'

export default function AdminReviews() {
  const supabase = createClient() as any
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'pending'|'published'|'all'>('pending')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('reviews')
        .select('*, customer:users(email, full_name), provider:providers(company_name), booking:bookings(pickup_time, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name))')
        .order('created_at', { ascending: false })
      if (data) setReviews(data)
      setLoading(false)
    }
    load()
  }, [])

  async function publish(reviewId: string) {
    await supabase.from('reviews').update({ is_published: true }).eq('id', reviewId)
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_published: true } : r))
  }

  async function unpublish(reviewId: string) {
    await supabase.from('reviews').update({ is_published: false }).eq('id', reviewId)
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, is_published: false } : r))
  }

  async function deleteReview(reviewId: string) {
    if (!confirm('Delete this review permanently?')) return
    await supabase.from('reviews').delete().eq('id', reviewId)
    setReviews(prev => prev.filter(r => r.id !== reviewId))
  }

  const filtered = reviews.filter((r: any) => {
    if (filter === 'pending') return !r.is_published
    if (filter === 'published') return r.is_published
    return true
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-medium mb-6">Reviews moderation</h1>

      <div className="flex gap-2 mb-6">
        {(['pending','published','all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 rounded border capitalize transition-all ${
              filter === f ? 'border-paper/35 text-paper' : 'border-border text-muted hover:text-paper'
            }`}>{f}</button>
        ))}
        <span className="text-xs text-muted self-center ml-2">{filtered.length} reviews</span>
      </div>

      {loading ? (
        <div className="text-muted text-sm py-10 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-muted text-sm py-10 text-center">No reviews found</div>
      ) : (
        <div className="flex flex-col gap-4">
          {filtered.map((r: any) => (
            <div key={r.id} className="bg-white/[0.03] border border-border rounded-lg p-5">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex gap-0.5 mb-1">
                    {[1,2,3,4,5].map(i => (
                      <div key={i} className={`w-3 h-3 ${i <= r.rating ? 'opacity-80' : 'opacity-15'}`}
                        style={{ background: 'currentColor', clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }} />
                    ))}
                  </div>
                  <div className="text-sm font-medium">{r.customer?.full_name ?? r.customer?.email ?? 'Anonymous'}</div>
                  <div className="text-xs text-muted mt-0.5">Provider: {r.provider?.company_name ?? '—'}</div>
                  {r.booking && (
                    <div className="text-xs text-muted">
                      {r.booking.pickup?.name} → {r.booking.dropoff?.name} ·{' '}
                      {new Date(r.booking.pickup_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${r.is_published ? 'bg-teal/15 text-teal' : 'bg-amber/15 text-amber'}`}>
                    {r.is_published ? 'Published' : 'Pending'}
                  </span>
                </div>
              </div>
              {r.aspects?.length > 0 && (
                <div className="flex gap-1 flex-wrap mb-2">
                  {r.aspects.map((a: string) => (
                    <span key={a} className="text-xs bg-white/5 px-2 py-0.5 rounded capitalize">{a.replace('_', ' ')}</span>
                  ))}
                </div>
              )}
              {r.comment && <p className="text-sm text-muted italic mb-3">&ldquo;{r.comment}&rdquo;</p>}
              <div className="flex gap-2 pt-3 border-t border-border">
                {r.is_published ? (
                  <button onClick={() => unpublish(r.id)} className="text-xs text-muted hover:text-paper transition-colors">
                    Unpublish
                  </button>
                ) : (
                  <button onClick={() => publish(r.id)}
                    className="text-xs bg-paper text-ink px-3 py-1.5 rounded hover:bg-paper/90 transition-colors">
                    Approve & publish
                  </button>
                )}
                <button onClick={() => deleteReview(r.id)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors ml-auto">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
