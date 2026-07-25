import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { SUPABASE_ANON_KEY, SUPABASE_URL } from './supabase-env'

// See lib/supabase-env.ts for why the values are resolved there rather than
// read straight from process.env.
export function createClient() {
  return createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
}
