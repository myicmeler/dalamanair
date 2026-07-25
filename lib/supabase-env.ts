// Resolved Supabase connection settings shared by every browser client factory.
//
// Netlify defines NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY in
// some contexts (deploy previews) without giving them a value, so the variables
// are present but empty. Next.js inlines that empty string into the bundle, and
// @supabase/ssr rejects it with "Your project's URL and API key are required",
// which crashes prerendering of the client-only pages and fails the build.
//
// Treat an empty value the same as a missing one and fall back to inert
// placeholders. Prerendering then produces the same shell it would in the
// browser; the real values are still required for the app to talk to Supabase
// at runtime.
const PLACEHOLDER_URL = 'http://localhost:54321'
const PLACEHOLDER_ANON_KEY = 'public-anon-key-placeholder'

function firstNonEmpty(value: string | undefined, fallback: string) {
  return value && value.length > 0 ? value : fallback
}

export const SUPABASE_URL = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  PLACEHOLDER_URL
)

export const SUPABASE_ANON_KEY = firstNonEmpty(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  PLACEHOLDER_ANON_KEY
)

/** True when real credentials were supplied at build time. */
export const hasSupabaseCredentials =
  SUPABASE_URL !== PLACEHOLDER_URL && SUPABASE_ANON_KEY !== PLACEHOLDER_ANON_KEY
