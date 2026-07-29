import type { Metadata } from 'next'

// The quote page (page.tsx) is a client component and can't export metadata,
// so this server-component layout carries its SEO. It renders children as-is.
export const metadata: Metadata = {
  title: 'Get a Quote',
  description:
    'Get free quotes for your Dalaman airport transfer to Marmaris, Içmeler, Fethiye, Hisarönü or Ölüdeniz. Tell us your route and dates and compare offers from vetted local companies.',
  keywords: [
    'Dalaman transfer quote',
    'Dalaman airport transfer price',
    'Dalaman to Marmaris transfer cost',
    'Dalaman transfer booking',
  ],
  alternates: { canonical: '/quote/' },
  openGraph: {
    title: 'Get a Dalaman Airport Transfer Quote',
    description:
      'Tell us your route and dates and compare free transfer offers from vetted local companies.',
    url: '/quote/',
  },
}

export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return children
}
