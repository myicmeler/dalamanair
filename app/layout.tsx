import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Script from 'next/script'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

// Site-wide SEO defaults. Per-page files (page.tsx / layout.tsx) override title,
// description, canonical and keywords; anything they omit falls back to here.
// The default title/description below double as the home page's SEO.
const SITE_URL = 'https://dalaman.me'
const TITLE = 'Dalaman Airport Transfers to Marmaris, Içmeler & Fethiye'
const DESCRIPTION =
  'Compare trusted local companies for Dalaman airport transfers to Marmaris, Içmeler, Fethiye, Hisarönü and Ölüdeniz. Book a private transfer in minutes and arrive at your hotel without the stress.'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${TITLE} | dalaman.me`,
    template: '%s | dalaman.me',
  },
  description: DESCRIPTION,
  keywords: [
    'Dalaman airport transfers',
    'Dalaman to Marmaris transfer',
    'Dalaman to Içmeler transfer',
    'Dalaman to Fethiye transfer',
    'Marmaris airport transfer',
    'Içmeler transfer',
    'Ölüdeniz transfer',
    'Hisarönü transfer',
    'Dalaman private transfer',
    'Dalaman airport taxi',
  ],
  applicationName: 'dalaman.me',
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'dalaman.me',
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_GB',
    images: [{ url: '/logo.jpg', width: 512, height: 512, alt: 'dalaman.me' }],
  },
  twitter: {
    card: 'summary',
    title: TITLE,
    description: DESCRIPTION,
    images: ['/logo.jpg'],
  },
}

// Organization structured data — helps Google understand dalaman.me is a
// transfer-booking service covering the Dalaman / Marmaris corridor.
const orgJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'dalaman.me',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.jpg`,
  description: DESCRIPTION,
  areaServed: ['Dalaman', 'Marmaris', 'Içmeler', 'Fethiye', 'Hisarönü', 'Ölüdeniz'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        <Script
          data-goatcounter="https://dalaman.goatcounter.com/count"
          src="//gc.zgo.at/count.js"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}
