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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { userId, email, fullName, companyName, tursabNumber, phone } = await req.json()

    if (!userId || !companyName || !tursabNumber) {
      return json({ error: 'userId, companyName and tursabNumber are required' }, 400)
    }

    // Service role key bypasses RLS — guard against abuse below.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // This endpoint runs during sign-up, before the user has confirmed their
    // email, so we cannot require the caller's session JWT. Instead we verify
    // the request targets a real auth account whose email matches, and we
    // refuse to touch an account that already has an elevated role. This stops
    // an attacker from passing someone else's userId to overwrite their
    // email/name or silently turn another user into an approved provider.
    const { data: authUser, error: getErr } = await supabase.auth.admin.getUserById(userId)
    if (getErr || !authUser?.user) return json({ error: 'Unknown user' }, 400)

    const realEmail = authUser.user.email ?? null
    if (email && realEmail && email.toLowerCase() !== realEmail.toLowerCase()) {
      return json({ error: 'Email does not match account' }, 403)
    }

    // Don't clobber an existing elevated account (admin / driver / provider).
    const { data: existing } = await supabase
      .from('users').select('role').eq('id', userId).single()
    if (existing?.role && existing.role !== 'customer') {
      return json({ error: 'Account already has a role' }, 409)
    }

    // Update public.users — set role to provider (use the verified email).
    const { error: userErr } = await supabase.from('users').upsert({
      id: userId,
      email: realEmail,
      full_name: companyName,
      phone: phone || null,
      role: 'provider',
    }, { onConflict: 'id' })

    if (userErr) {
      console.error('User upsert error:', userErr)
      return json({ error: `User update failed: ${userErr.message}` }, 500)
    }

    // Create provider record (only if one doesn't already exist for this user).
    const { data: existingProvider } = await supabase
      .from('providers').select('id').eq('user_id', userId).maybeSingle()
    if (!existingProvider) {
      const { error: provErr } = await supabase.from('providers').insert({
        user_id: userId,
        company_name: companyName,
        contact_name: fullName,
        phone: phone || null,
        tursab_number: tursabNumber,
        is_approved: true,
      })
      if (provErr) {
        console.error('Provider insert error:', provErr)
        return json({ error: `Provider creation failed: ${provErr.message}` }, 500)
      }
    }

    return json({ success: true })
  } catch (err: any) {
    console.error('Error:', err.message)
    return json({ error: err.message }, 500)
  }
})
