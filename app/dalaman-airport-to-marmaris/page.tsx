import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = 'https://dalaman.me'

export const metadata: Metadata = {
  title: 'Dalaman Airport to Marmaris Transfer',
  description:
    'Compare trusted private transfers from Dalaman Airport to Marmaris. Get quotes for Marmaris, Içmeler, Turunç, Datça, Fethiye, Ölüdeniz and more.',
  keywords: [
    'Dalaman Airport to Marmaris transfer',
    'Dalaman to Marmaris private transfer',
    'Marmaris airport transfer',
    'Dalaman Airport taxi Marmaris',
    'Dalaman Airport transfers',
  ],
  alternates: { canonical: '/dalaman-airport-to-marmaris/' },
  openGraph: {
    type: 'website',
    url: \`\${SITE_URL}/dalaman-airport-to-marmaris/\`,
    title: 'Dalaman Airport to Marmaris Transfer',
    description: 'Compare trusted local providers for your private Dalaman Airport to Marmaris transfer.',
    images: [{ url: '/logo.jpg', width: 512, height: 512, alt: 'dalaman.me private airport transfers' }],
  },
  twitter: {
    card: 'summary',
    title: 'Dalaman Airport to Marmaris Transfer',
    description: 'Compare trusted local providers for your private Dalaman Airport to Marmaris transfer.',
    images: ['/logo.jpg'],
  },
}

const destinations = [
  'Marmaris', 'Içmeler', 'Turunç', 'Datça', 'Fethiye', 'Hisarönü', 'Ölüdeniz', 'Kaş', 'Kalkan',
]

const airports = [
  'Dalaman Airport (DLM)',
  'Antalya Airport',
  'Bodrum–Milas Airport (BJV)',
  'İzmir Adnan Menderes Airport',
]

const faq = [
  {
    question: 'How do I arrange a Dalaman Airport to Marmaris transfer?',
    answer: 'Tell us your journey details, compare offers from local transfer companies and choose the option that works for you before you travel.',
  },
  {
    question: 'Can I book a private transfer for Içmeler, Turunç or Datça?',
    answer: 'Yes. Start with your airport and final destination to request quotes for Marmaris and the surrounding coast.',
  },
  {
    question: 'Which airports can I search from?',
    answer: 'The service includes Dalaman, Antalya, Bodrum–Milas and İzmir Adnan Menderes airports, alongside the active destinations shown on this page.',
  },
]

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map(({ question, answer }) => ({
    '@type': 'Question',
    name: question,
    acceptedAnswer: { '@type': 'Answer', text: answer },
  })),
}

export default function DalamanToMarmarisPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0f1419', color: '#fff' }}>
      <header style={{ maxWidth: 1120, margin: '0 auto', padding: '20px' }}>
        <Link href="/" style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.16em', fontSize: 12, textDecoration: 'none' }}>
          DALAMAN.ME
        </Link>
      </header>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '52px 20px 36px' }}>
        <p style={{ color: '#f4b942', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Private airport transfers
        </p>
        <h1 style={{ maxWidth: 800, margin: 0, fontSize: 'clamp(34px, 6vw, 62px)', lineHeight: 1.08, fontWeight: 500 }}>
          Dalaman Airport to <span style={{ color: '#f4b942' }}>Marmaris transfers</span>
        </h1>
        <p style={{ maxWidth: 660, color: 'rgba(255,255,255,0.68)', fontSize: 17, lineHeight: 1.7, margin: '22px 0 30px' }}>
          Compare trusted local providers for a private transfer from Dalaman Airport to Marmaris. Arrange your ride before you fly, then travel directly to your hotel without airport queues or on-the-day negotiation.
        </p>
        <Link href="/quote/" style={{ display: 'inline-block', borderRadius: 6, padding: '14px 22px', background: '#f4b942', color: '#0f1419', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Get transfer quotes
        </Link>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '26px 20px 64px', display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
        {[
          ['Book before you fly', 'Request and compare local transfer options ahead of arrival.'],
          ['Private, door-to-door travel', 'Choose a transfer from the airport to your chosen hotel or resort.'],
          ['More than one destination', 'Search the wider coast, not only Marmaris, from one place.'],
        ].map(([title, text]) => (
          <article key={title} style={{ padding: 20, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.035)' }}>
            <h2 style={{ fontSize: 17, margin: '0 0 8px', fontWeight: 600 }}>{title}</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, fontSize: 14 }}>{text}</p>
          </article>
        ))}
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 64px' }}>
        <h2 style={{ fontSize: 28, margin: '0 0 14px' }}>Airport transfers across the coast</h2>
        <p style={{ maxWidth: 760, color: 'rgba(255,255,255,0.68)', lineHeight: 1.75 }}>
          Dalaman is the natural arrival airport for Marmaris, Içmeler and Turunç. You can also search transfers from Antalya, Bodrum–Milas and İzmir Adnan Menderes airports, with destinations across the Marmaris and Fethiye coast.
        </p>
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginTop: 24 }}>
          <div style={{ padding: 20, borderRadius: 10, background: '#1a1f26' }}>
            <h3 style={{ marginTop: 0, color: '#f4b942', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Airports</h3>
            <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, color: 'rgba(255,255,255,0.72)' }}>
              {airports.map(airport => <li key={airport}>{airport}</li>)}
            </ul>
          </div>
          <div style={{ padding: 20, borderRadius: 10, background: '#1a1f26' }}>
            <h3 style={{ marginTop: 0, color: '#f4b942', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Destinations</h3>
            <p style={{ margin: 0, lineHeight: 1.8, color: 'rgba(255,255,255,0.72)' }}>{destinations.join(' · ')}</p>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 76px' }}>
        <h2 style={{ fontSize: 28, margin: '0 0 20px' }}>Dalaman to Marmaris transfer questions</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {faq.map(item => (
            <article key={item.question} style={{ padding: 20, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>{item.question}</h3>
              <p style={{ margin: 0, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65 }}>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section style={{ background: '#1a1f26', padding: '48px 20px', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 28 }}>Ready to arrange your transfer?</h2>
        <p style={{ maxWidth: 560, margin: '0 auto 24px', color: 'rgba(255,255,255,0.64)', lineHeight: 1.65 }}>
          Search your airport and destination, then compare local transfer offers before you travel.
        </p>
        <Link href="/quote/" style={{ display: 'inline-block', borderRadius: 6, padding: '14px 22px', background: '#f4b942', color: '#0f1419', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Request quotes
        </Link>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  )
}
