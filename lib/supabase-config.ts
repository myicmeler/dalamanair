// Resolved Supabase connection values shared by the browser clients.
//
// During Next.js prerendering on the build server the NEXT_PUBLIC_* vars may be
// missing *or defined as an empty string* (e.g. a deploy-preview context where
// they are scoped to production only). @supabase/ssr throws on any falsy value,
// which fails the whole build, so anything blank falls back to a harmless
// placeholder. Real values are required — and inlined — for the browser bundle.
function envOr(value: string | undefined, fallback: string) {
  return value && value.trim() !== '' ? value : fallback
}

export const SUPABASE_URL = envOr(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  'http://localhost:54321'
)

export const SUPABASE_ANON_KEY = envOr(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'public-anon-key-placeholder'
)
