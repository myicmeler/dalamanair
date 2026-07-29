import type { Metadata } from 'next'

// The help page (page.tsx) is a client component and can't export metadata,
// so this server-component layout carries its SEO. It renders children as-is.
export const metadata: Metadata = {
  title: 'Help & FAQ',
  description:
    'Answers to common questions about booking a Dalaman airport transfer with dalaman.me — quotes, payment, luggage, child seats, meeting your driver and changes to your trip.',
  keywords: [
    'Dalaman transfer help',
    'Dalaman airport transfer FAQ',
    'Dalaman transfer questions',
    'Marmaris transfer help',
  ],
  alternates: { canonical: '/help/' },
  openGraph: {
    title: 'Help & FAQ — Dalaman Airport Transfers',
    description:
      'Common questions about booking a Dalaman airport transfer: quotes, payment, luggage, child seats and meeting your driver.',
    url: '/help/',
  },
}

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children
}
