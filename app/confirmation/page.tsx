'use client'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Nav from '@/components/ui/Nav'

function ConfirmationContent() {
  const params = useSearchParams()
  const ref    = params.get('ref') ?? 'TMR-...'

  return (
    <div className="min-h-screen bg-ink text-paper">
      <Nav lang="en" />
      <div className="flex flex-col items-center justify-center px-10 py-20 text-center">
        <div className="w-16 h-16 rounded-full border border-paper/20 flex items-center justify-center text-2xl mb-8">
          ✓
        </div>
        <h1 className="text-3xl font-medium mb-3">Booking confirmed</h1>
        <p className="text-muted mb-2">Your transfer is booked. See you in Içmeler!</p>
        <p className="text-xs tracking-widest text-paper/25 mb-10">Booking ref: {ref}</p>

        <div className="grid grid-cols-2 gap-3 max-w-lg w-full mb-10">
          {[
            { label: 'What next?',      val: 'Confirmation email on its way' },
            { label: 'Driver details',  val: 'Sent 24h before pick-up' },
            { label: 'After your trip', val: 'Review request sent automatically' },
            { label: 'Questions?',      val: 'help@transfermarmaris.com' },
          ].map(c => (
            <div key={c.label} className="bg-white/[0.03] border border-border rounded-lg p-4 text-left">
              <p className="text-xs tracking-widest text-muted uppercase mb-1">{c.label}</p>
              <p className="text-sm">{c.val}</p>
            </div>
          ))}
        </div>

        <Link href="/" className="text-sm text-muted hover:text-paper transition-colors underline">
          ← Book another transfer
        </Link>
      </div>
    </div>
  )
}

export default function ConfirmationPage() {
  return <Suspense fallback={<div className="min-h-screen bg-ink"/>}><ConfirmationContent /></Suspense>
}
