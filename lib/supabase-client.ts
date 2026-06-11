import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

// See lib/supabase.ts — placeholders keep build-time prerendering from
// crashing when NEXT_PUBLIC_* vars are absent in the build context.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'public-anon-key-placeholder'
  )
}
