import type { Metadata } from 'next'

// The search page (page.tsx) is a client component and can't export metadata,
// so this server-component layout carries its SEO. It renders children as-is.
export const metadata: Metadata = {
  title: 'Search Transfers',
  description:
    'Search Dalaman airport transfers to Marmaris, Içmeler, Fethiye, Hisarönü and Ölüdeniz. Compare trusted local companies and book your private transfer in minutes.',
  keywords: [
    'search Dalaman transfers',
    'Dalaman airport transfer search',
    'compare Dalaman transfers',
    'Marmaris transfer search',
  ],
  alternates: { canonical: '/search/' },
  openGraph: {
    title: 'Search Dalaman Airport Transfers',
    description:
      'Compare trusted local companies and book your private Dalaman airport transfer in minutes.',
    url: '/search/',
  },
}

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children
}
