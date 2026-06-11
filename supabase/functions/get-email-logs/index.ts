import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // --- AUTHORIZATION: admin only ---
    // These are Mailgun delivery logs — they contain every recipient's email
    // address and message subjects (customer PII). verify_jwt is satisfied by
    // the public anon key, so we must resolve the bearer to a real admin user.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )
    const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token)
    if (authErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: caller } = await supabaseAdmin
      .from('users').select('role').eq('id', user.id).single()
    if (!caller || caller.role !== 'admin') {
      return json({ error: 'Forbidden — admin access required' }, 403)
    }
    // --- end authorization ---

    const url = new URL(req.url)
    const limit = url.searchParams.get('limit') ?? '50'
    const event = url.searchParams.get('event') ?? ''
    const page = url.searchParams.get('page') ?? ''

    const MAILGUN_API_KEY = Deno.env.get('MAILGUN_API_KEY')
    const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN') ?? 'mg.dalaman.me'

    if (!MAILGUN_API_KEY) {
      return json({ error: 'MAILGUN_API_KEY not set' }, 500)
    }

    // Build Mailgun events URL
    let mailgunUrl = `https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/events?limit=${limit}&ascending=no`
    if (event) mailgunUrl += `&event=${event}`
    if (page) mailgunUrl += `&page=${page}`

    const response = await fetch(mailgunUrl, {
      headers: {
        'Authorization': 'Basic ' + btoa(`api:${MAILGUN_API_KEY}`),
      },
    })

    if (!response.ok) {
      const text = await response.text()
      return json({ error: `Mailgun error: ${text}` }, response.status)
    }

    const data = await response.json()
    return json(data)
  } catch (err: any) {
    return json({ error: err.message }, 500)
  }
})
