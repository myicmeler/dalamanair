'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase'
import ProviderLayout from './layout'

export default function ProviderReviews() {
  const supabase = createClient() as any
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [avgRating, setAvgRating] = useState(0)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: provider } = await supabase.from('providers').select('id, avg_rating').eq('user_id', user.id).single()
      if (!provider) return
      setAvgRating(provider.avg_rating || 0)
      const { data: rv } = await supabase
        .from('reviews')
        .select('*, customer:users(full_name), booking:bookings(pickup_time, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name))')
        .eq('provider_id', provider.id)
        .order('created_at', { ascending: false })
      if (rv) setReviews(rv)
      setLoading(false)
    }
    load()
  }, [])

  return (
    <ProviderLayout>
      <div className="p-8">
        <div className="flex items-baseline gap-4 mb-8">
          <h1 className="text-2xl font-medium">Reviews</h1>
          <div className="text-3xl font-medium text-paper/20">{avgRating.toFixed(1)}★</div>
          <div className="text-sm text-muted">{reviews.length} reviews</div>
        </div>

        {loading ? (
          <div className="text-muted text-sm py-10 text-center">Loading...</div>
        ) : reviews.length === 0 ? (
          <div className="text-muted text-sm py-10 text-center">No reviews yet</div>
        ) : (
          <div className="flex flex-col gap-4">
            {reviews.map((r: any) => (
              <div key={r.id} className="bg-white/[0.03] border border-border rounded-lg p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex gap-0.5 mb-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-3 h-3 ${i <= r.rating ? 'opacity-80' : 'opacity-15'}`}
                          style={{ background: 'currentColor', clipPath: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)' }} />
                      ))}
                    </div>
                    <div className="text-sm font-medium">{r.customer?.full_name ?? 'Anonymous'}</div>
                    {r.booking && (
                      <div className="text-xs text-muted mt-0.5">
                        {r.booking.pickup?.name} → {r.booking.dropoff?.name} ·{' '}
                        {new Date(r.booking.pickup_time).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${r.is_published ? 'bg-teal/15 text-teal' : 'bg-amber/15 text-amber'}`}>
                      {r.is_published ? 'Published' : 'Pending'}
                    </span>
                    <span className="text-xs text-muted">
                      {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
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
                {r.comment && <p className="text-sm text-muted italic">"{r.comment}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProviderLayout>
  )
}
