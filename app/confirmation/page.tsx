'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'

function ConfirmationContent() {
  const params = useSearchParams()
  const ref = params.get('ref') ?? 'DMR-...'

  return (
    <div className="min-h-screen bg-paper">
      <Nav lang="en" />
      <div className="max-w-3xl mx-auto px-8 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center text-2xl mx-auto mb-8 text-accent-2">✓</div>
        <p className="text-[11px] tracking-[0.25em] text-accent-2 uppercase mb-3">Confirmed</p>
        <h1 className="text-3xl md:text-4xl font-medium text-ink mb-3">Booking confirmed</h1>
        <p className="text-[14px] text-sub mb-2">Your transfer is booked. See you in Içmeler!</p>
        <p className="text-[11px] tracking-[0.15em] text-muted mb-12 uppercase">Booking ref: {ref}</p>

        <div className="grid md:grid-cols-2 gap-3 max-w-xl mx-auto mb-12 text-left">
          {[
            { label: 'What next?', val: 'Confirmation email on its way' },
            { label: 'Driver details', val: 'Sent 24h before pick-up' },
            { label: 'After your trip', val: 'Review request sent automatically' },
            { label: 'Questions?', val: 'help@dalamanair.com' },
          ].map(c => (
            <div key={c.label} className="bg-white border border-line rounded-md p-4">
              <p className="text-[10px] tracking-[0.15em] uppercase text-muted mb-1">{c.label}</p>
              <p className="text-[13px] text-ink">{c.val}</p>
            </div>
          ))}
        </div>

        <Link href="/" className="text-[13px] text-muted hover:text-ink transition-colors underline">
          ← Book another transfer
        </Link>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return <Suspense fallback={<div className="min-h-screen bg-paper"/>}><ConfirmationContent /></Suspense>
}
