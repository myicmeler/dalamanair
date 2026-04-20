'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

const ASPECTS = [
  { key: 'on_time', en: 'On time', tr: 'Zamanında' },
  { key: 'clean_car', en: 'Clean car', tr: 'Temiz araç' },
  { key: 'friendly', en: 'Friendly driver', tr: 'Güleryüzlü sürücü' },
  { key: 'smooth_ride', en: 'Smooth ride', tr: 'Rahat yolculuk' },
  { key: 'safe_driving', en: 'Safe driving', tr: 'Güvenli sürüş' },
  { key: 'english_spoken', en: 'Spoke English', tr: 'İngilizce' },
  { key: 'helpful_luggage', en: 'Helped with luggage', tr: 'Bagaj yardımı' },
  { key: 'good_value', en: 'Good value', tr: 'Uygun fiyat' },
]

function ReviewContent() {
  const params = useSearchParams()
  const router = useRouter()
  const supabase = createClient() as any
  const token = params.get('token') ?? ''
  const [lang, setLang] = useState<'en'|'tr'>('en')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [booking, setBooking] = useState<any>(null)
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [selectedAspects, setSelectedAspects] = useState<string[]>([])
  const [comment, setComment] = useState('')

  useEffect(() => {
    async function load() {
      if (!token) {
        setError(lang === 'en' ? 'Invalid review link' : 'Geçersiz değerlendirme bağlantısı')
        setLoading(false)
        return
      }
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const { data } = await supabase
          .from('bookings')
          .select('id, status, pickup_time, customer_id, provider_id, driver_id, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), driver:drivers(full_name), provider:providers(company_name)')
          .eq('id', token)
          .eq('status', 'completed')
          .single()
        if (data) {
          setBooking(data)
        } else {
          setError(lang === 'en' ? 'Booking not found or not completed yet' : 'Rezervasyon bulunamadı veya henüz tamamlanmadı')
        }
      } else {
        const { data } = await supabase
          .from('bookings')
          .select('id, status, pickup_time, customer_id, provider_id, driver_id, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name), driver:drivers(full_name), provider:providers(company_name)')
          .eq('id', token)
          .single()
        if (data) {
          if (data.status !== 'completed') {
            setError(lang === 'en' ? 'You can only review completed trips' : 'Yalnızca tamamlanmış seyahatleri değerlendirebilirsiniz')
          } else if (data.customer_id !== user.id) {
            setError(lang === 'en' ? 'This booking isn\'t yours' : 'Bu rezervasyon size ait değil')
          } else {
            setBooking(data)
          }
        } else {
          setError(lang === 'en' ? 'Booking not found' : 'Rezervasyon bulunamadı')
        }
      }
      setLoading(false)
    }
    load()
  }, [token])

  function toggleAspect(key: string) {
    setSelectedAspects(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    )
  }

  async function submitReview() {
    if (!booking || rating === 0) return
    setSubmitting(true)
    const { error: e } = await supabase.from('reviews').insert({
      booking_id: booking.id,
      customer_id: booking.customer_id,
      provider_id: booking.provider_id,
      driver_id: booking.driver_id,
      rating,
      aspects: selectedAspects,
      comment: comment || null,
      is_published: false,
    })
    if (e) {
      setError(lang === 'en' ? 'Could not save review. Please try again.' : 'Değerlendirme kaydedilemedi. Lütfen tekrar deneyin.')
      setSubmitting(false)
      return
    }
    setSubmitted(true)
    setSubmitting(false)
  }

  if (loading) {
    return <div className="min-h-screen bg-paper flex items-center justify-center text-muted text-sm">Loading...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <Link href="/" className="text-[11px] tracking-[0.22em] text-ink block mb-10 font-medium">DALAMANAIR</Link>
          <div className="w-14 h-14 rounded-full bg-red-50 text-red-600 flex items-center justify-center text-2xl mx-auto mb-6">!</div>
          <h1 className="text-2xl font-medium text-ink mb-3">{lang === 'en' ? 'Something went wrong' : 'Bir sorun oluştu'}</h1>
          <p className="text-[13px] text-sub mb-6">{error}</p>
          <Link href="/" className="text-[13px] text-muted hover:text-ink underline">← {lang === 'en' ? 'Home' : 'Ana sayfa'}</Link>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="max-w-sm text-center">
          <Link href="/" className="text-[11px] tracking-[0.22em] text-ink block mb-10 font-medium">DALAMANAIR</Link>
          <div className="w-14 h-14 rounded-full bg-accent/20 text-accent-2 flex items-center justify-center text-2xl mx-auto mb-6">✓</div>
          <h1 className="text-2xl font-medium text-ink mb-3">{lang === 'en' ? 'Thank you!' : 'Teşekkürler!'}</h1>
          <p className="text-[13px] text-sub mb-6">
            {lang === 'en' 
              ? 'Your review helps other travellers and helps us improve. We really appreciate it.'
              : 'Değerlendirmeniz diğer yolculara yardımcı olur ve bize gelişme fırsatı verir. Çok teşekkür ederiz.'}
          </p>
          <Link href="/" className="inline-block text-[11px] tracking-wider uppercase bg-accent hover:bg-accent-2 text-ink font-medium px-5 py-2.5 rounded transition-colors">
            {lang === 'en' ? 'Book another transfer' : 'Başka transfer rezerve et'} →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper">
      <div className="px-5 py-8 border-b border-line bg-white flex justify-between items-center">
        <Link href="/" className="text-[11px] tracking-[0.22em] text-ink font-medium">DALAMANAIR</Link>
        <div className="flex gap-2 text-[11px] tracking-widest">
          {(['en','tr'] as const).map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`transition-colors ${lang === l ? 'text-ink' : 'text-muted hover:text-sub'}`}>
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-md mx-auto px-5 py-10">
        <p className="text-[11px] tracking-[0.25em] text-accent-2 uppercase mb-3 text-center">
          {lang === 'en' ? 'How was your trip?' : 'Seyahatiniz nasıldı?'}
        </p>
        <h1 className="text-2xl font-medium text-ink mb-2 text-center">
          {lang === 'en' ? 'Rate your transfer' : 'Transferinizi değerlendirin'}
        </h1>

        {booking && (
          <div className="bg-white border border-line rounded-md p-4 mb-6 text-center">
            <div className="text-[15px] font-medium text-ink">
              {booking.pickup?.name} → {booking.dropoff?.name}
            </div>
            <div className="text-[12px] text-muted mt-1">
              {new Date(booking.pickup_time).toLocaleDateString(lang === 'en' ? 'en-GB' : 'tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            {booking.driver?.full_name && (
              <div className="text-[12px] text-muted mt-0.5">
                {lang === 'en' ? 'Driver' : 'Sürücü'}: {booking.driver.full_name}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-center gap-2 mb-8">
          {[1,2,3,4,5].map(i => (
            <button key={i}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              onClick={() => setRating(i)}
              className="text-4xl transition-transform hover:scale-110">
              <span style={{
                color: i <= (hoverRating || rating) ? '#f4b942' : '#e5e3dd',
                transition: 'color 0.15s'
              }}>★</span>
            </button>
          ))}
        </div>

        {rating > 0 && (
          <>
            <div className="mb-6">
              <p className="text-[11px] tracking-[0.15em] uppercase text-muted mb-3 text-center">
                {lang === 'en' ? 'What stood out?' : 'Öne çıkanlar?'}
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {ASPECTS.map(a => (
                  <button key={a.key} onClick={() => toggleAspect(a.key)}
                    className={`text-[12px] px-3 py-2 rounded border transition-all ${
                      selectedAspects.includes(a.key)
                        ? 'border-accent bg-accent/10 text-ink'
                        : 'border-line text-sub hover:border-sub'
                    }`}>
                    {lang === 'en' ? a.en : a.tr}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="text-[11px] tracking-[0.15em] uppercase text-muted mb-2 block">
                {lang === 'en' ? 'Anything else? (optional)' : 'Başka? (isteğe bağlı)'}
              </label>
              <textarea value={comment} onChange={e => setComment(e.target.value)}
                placeholder={lang === 'en' ? 'Share your experience...' : 'Deneyiminizi paylaşın...'}
                rows={4} className="w-full resize-none" />
            </div>

            <button onClick={submitReview} disabled={submitting || rating === 0}
              className="w-full bg-accent hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed text-ink font-medium text-[12px] tracking-[0.08em] uppercase py-3 rounded transition-colors">
              {submitting ? (lang === 'en' ? 'Submitting...' : 'Gönderiliyor...') : (lang === 'en' ? 'Submit review' : 'Değerlendirmeyi gönder')} →
            </button>
            <p className="text-[11px] text-muted text-center mt-4 leading-relaxed">
              {lang === 'en' 
                ? 'Your review will be published after moderation.'
                : 'Değerlendirmeniz moderasyon sonrası yayınlanacaktır.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function ReviewPage() {
  return <Suspense fallback={<div className="min-h-screen bg-paper"/>}><ReviewContent /></Suspense>
}
