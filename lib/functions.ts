import { createClient } from '@/lib/supabase'

/**
 * Invoke a Supabase Edge Function authenticated as the *signed-in user*.
 *
 * Edge functions authorize on this user token — never on the public anon key
 * (which anyone can read from the browser bundle and which satisfies
 * verify_jwt without proving identity). Always call privileged functions
 * through this helper so the caller's identity travels with the request.
 */
export async function callFunction(
  path: string,
  body: unknown,
  init?: { method?: string },
): Promise<Response> {
  const { data: { session } } = await createClient().auth.getSession()
  return fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${path}`, {
    method: init?.method ?? 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${session?.access_token ?? ''}`,
    },
    body: JSON.stringify(body),
  })
}
