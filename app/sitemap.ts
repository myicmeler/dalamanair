import type { MetadataRoute } from 'next'

const SITE_URL = 'https://dalaman.me'

// Only the publicly indexable pages. Trailing slashes match the site's URLs
// (next.config.js sets trailingSlash: true). Keep in sync with the allow/
// disallow rules in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/how-it-works/`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${SITE_URL}/help/`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE_URL}/quote/`, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${SITE_URL}/search/`, changeFrequency: 'weekly', priority: 0.5 },
  ]
}
