import { createBrowserClient } from '@supabase/ssr'

// During Next.js prerendering on the build server the NEXT_PUBLIC_* vars
// may be absent (e.g. a deploy-preview context without them configured),
// which makes @supabase/ssr throw and fails the whole build. Fall back to
// harmless placeholders so prerendering of the (client-only) pages still
// succeeds. Real values are required — and inlined — for the browser bundle.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key-placeholder'
  )
}
