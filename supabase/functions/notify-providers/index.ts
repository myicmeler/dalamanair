import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { serverKeys, isServerRequest } from '../_shared/server-auth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
  try {
    const keys = serverKeys()
    if (!keys.admin) throw new Error('Server authentication not configured')
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', keys.admin)
    const internal = isServerRequest(req, keys.values)
    let callerId: string | null = null
    let isAdmin = false
    if (!internal) {
      const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
      const { data: { user }, error } = await supabase.auth.getUser(token)
      if (error || !user) return json({ error: 'Unauthorized' }, 401)
      callerId = user.id
      const { data: profile, error: profileError } = await supabase.from('users').select('role').eq('id', callerId).single()
      if (profileError) throw profileError
      isAdmin = profile?.role === 'admin'
    }
    const { requestId } = await req.json()
    if (typeof requestId !== 'string' || !/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: 'Valid requestId is required' }, 400)
    const { data: request, error } = await supabase.from('quote_requests').select('customer_id,status').eq('id', requestId).single()
    if (error || !request) return json({ error: 'Request not found' }, 404)
    if (!internal && !isAdmin && request.customer_id !== callerId) return json({ error: 'Forbidden' }, 403)
    if (request.status !== 'open') return json({ error: 'This request is no longer open' }, 409)
    // Customer retries cannot send another blast. Only a deliberate admin push
    // creates reminder jobs; normal inserts are already queued by the trigger.
    const { data: queued, error: queueError } = await supabase.rpc('enqueue_provider_notifications', {
      p_request_id: requestId, p_reminder: isAdmin,
    })
    if (queueError) throw queueError
    return json({ queued: queued ?? 0, sent: 0 }, 202)
  } catch (err) {
    console.error('Provider queue failed:', err)
    return json({ error: 'Could not queue provider notifications' }, 500)
  }
})
