import type { Metadata } from 'next'
import Link from 'next/link'

const SITE_URL = 'https://dalaman.me'

export const metadata: Metadata = {
  title: 'Dalaman Airport to Içmeler Transfer & Return',
  description:
    'Compare trusted private transfers from Dalaman Airport to Içmeler, including return transfers from Içmeler to Dalaman Airport. Request quotes before you travel.',
  keywords: [
    'Dalaman Airport to Içmeler transfer',
    'Içmeler to Dalaman Airport return transfer',
    'Dalaman to Icmeler private transfer',
    'Içmeler airport transfer',
  ],
  alternates: { canonical: '/dalaman-airport-to-icmeler/' },
  openGraph: {
    type: 'website',
    url: SITE_URL + '/dalaman-airport-to-icmeler/',
    title: 'Dalaman Airport to Içmeler Transfer & Return',
    description: 'Compare trusted local providers for private Dalaman Airport and Içmeler return transfers.',
    images: [{ url: '/logo.jpg', width: 512, height: 512, alt: 'dalaman.me private airport transfers' }],
  },
}

const faq = [
  {
    question: 'Can I book a return transfer from Içmeler to Dalaman Airport?',
    answer: 'Yes. When requesting quotes, add your return journey so local providers can price both the arrival transfer and your journey back to Dalaman Airport.',
  },
  {
    question: 'Can I arrange a private Dalaman Airport to Içmeler transfer?',
    answer: 'Yes. Request quotes for your flight arrival and Içmeler accommodation, then compare suitable local transfer options before you travel.',
  },
  {
    question: 'Can I search other nearby destinations too?',
    answer: 'Yes. You can also request transfers for Marmaris, Turunç, Datça, Fethiye, Hisarönü and Ölüdeniz.',
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

export default function DalamanToIcmelerPage() {
  return (
    <main style={{ minHeight: '100vh', background: '#0f1419', color: '#fff' }}>
      <header style={{ maxWidth: 1120, margin: '0 auto', padding: '20px' }}>
        <Link href="/" style={{ color: '#fff', fontWeight: 700, letterSpacing: '0.16em', fontSize: 12, textDecoration: 'none' }}>
          DALAMAN.ME
        </Link>
      </header>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '52px 20px 42px' }}>
        <p style={{ color: '#f4b942', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', margin: '0 0 14px' }}>
          Private airport transfers
        </p>
        <h1 style={{ maxWidth: 830, margin: 0, fontSize: 'clamp(34px, 6vw, 62px)', lineHeight: 1.08, fontWeight: 500 }}>
          Dalaman Airport to <span style={{ color: '#f4b942' }}>Içmeler transfers</span>
        </h1>
        <p style={{ maxWidth: 690, color: 'rgba(255,255,255,0.68)', fontSize: 17, lineHeight: 1.7, margin: '22px 0 30px' }}>
          Arrange a private transfer from Dalaman Airport to Içmeler, then add your return journey from Içmeler to Dalaman Airport in the same quote request. Compare trusted local providers before you fly.
        </p>
        <Link href="/quote/" style={{ display: 'inline-block', borderRadius: 6, padding: '14px 22px', background: '#f4b942', color: '#0f1419', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Get Içmeler transfer quotes
        </Link>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 64px', display: 'grid', gap: 18, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
        {[
          ['Arrival and return in one request', 'Add a return journey when you request quotes, so you can plan both airport transfers together.'],
          ['Private, door-to-door travel', 'Search from Dalaman Airport to your Içmeler hotel or accommodation.'],
          ['Compare local options', 'Choose the transfer offer that suits your dates, group and travel plans.'],
        ].map(([title, text]) => (
          <article key={title} style={{ padding: 20, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, background: 'rgba(255,255,255,0.035)' }}>
            <h2 style={{ fontSize: 17, margin: '0 0 8px', fontWeight: 600 }}>{title}</h2>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.62)', lineHeight: 1.6, fontSize: 14 }}>{text}</p>
          </article>
        ))}
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 64px' }}>
        <h2 style={{ fontSize: 28, margin: '0 0 14px' }}>Içmeler airport transfer, both ways</h2>
        <p style={{ maxWidth: 760, color: 'rgba(255,255,255,0.68)', lineHeight: 1.75 }}>
          A return transfer is useful when you know your departure date and flight time. Start with Dalaman Airport and Içmeler for the outbound journey, then add the return from Içmeler to Dalaman Airport when you request your quotes.
        </p>
      </section>

      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 20px 76px' }}>
        <h2 style={{ fontSize: 28, margin: '0 0 20px' }}>Dalaman to Içmeler transfer questions</h2>
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
        <h2 style={{ margin: '0 0 12px', fontSize: 28 }}>Plan your Içmeler return transfer</h2>
        <p style={{ maxWidth: 560, margin: '0 auto 24px', color: 'rgba(255,255,255,0.64)', lineHeight: 1.65 }}>
          Add your arrival and return journeys, then compare local transfer offers before you travel.
        </p>
        <Link href="/quote/" style={{ display: 'inline-block', borderRadius: 6, padding: '14px 22px', background: '#f4b942', color: '#0f1419', fontWeight: 700, fontSize: 13, letterSpacing: '0.06em', textTransform: 'uppercase', textDecoration: 'none' }}>
          Request quotes
        </Link>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
    </main>
  )
}
