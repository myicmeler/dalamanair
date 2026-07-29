import type { MetadataRoute } from 'next'

const SITE_URL = 'https://dalaman.me'

// Public marketing pages are crawlable. Everything behind sign-in or inside a
// booking flow is disallowed — these carry no SEO value and shouldn't appear
// in search results. The admin and provider areas use client-component layouts
// that can't emit a noindex meta tag, so the crawl block lives here instead.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/provider/',
        '/driver/',
        '/auth/',
        '/profile/',
        '/bookings/',
        '/quotes/',
        '/booking/',
        '/confirmation/',
        '/review/',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
