import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const APP_URL        = Deno.env.get('APP_URL')         ?? 'https://dalaman.me'
const MAILGUN_KEY    = Deno.env.get('MAILGUN_API_KEY')  ?? ''
const MAILGUN_DOMAIN = Deno.env.get('MAILGUN_DOMAIN')   ?? 'mg.dalaman.me'
const MAILGUN_FROM   = Deno.env.get('MAILGUN_FROM')     ?? 'dalaman.me <post@dalaman.me>'

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const url = `https://api.eu.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`
  const form = new FormData()
  form.append('from', MAILGUN_FROM)
  form.append('to', to)
  form.append('subject', subject)
  form.append('html', html)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Basic ${btoa('api:' + MAILGUN_KEY)}` },
      body: form,
    })
    if (res.ok) { console.log(`Sent to ${to}`); return true }
    const err = await res.text()
    console.error(`Failed:`, err)
    return false
  } catch (e) {
    console.error(`Exception:`, e)
    return false
  }
}

function welcomeEmail(name: string, setPasswordUrl: string) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#0f1419;font-family:Arial,Helvetica,sans-serif"><div style="background:#0f1419;padding:32px 16px"><div style="max-width:560px;margin:0 auto"><div style="padding:24px 0;text-align:center;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:20px"><span style="font-size:12px;font-weight:700;letter-spacing:0.22em;color:#ffffff">DALAMAN.ME</span></div><div style="background:#1a1f26;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:32px;margin-bottom:20px"><p style="font-size:10px;letter-spacing:0.2em;color:#f4b942;text-transform:uppercase;margin:0 0 10px">Welcome</p><h1 style="font-size:22px;font-weight:500;color:#ffffff;margin:0 0 12px">Your provider account is ready</h1><p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 8px">Hi ${name},</p><p style="font-size:14px;color:rgba(255,255,255,0.6);line-height:1.7;margin:0 0 20px">Your provider account on dalaman.me has been created. Click below to set your password and access your dashboard.</p><a href="${setPasswordUrl}" style="display:inline-block;background:#f4b942;color:#0f1419;padding:13px 26px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;text-decoration:none">Set your password →</a><p style="font-size:12px;color:rgba(255,255,255,0.3);margin:16px 0 0">This link expires in 24 hours.</p></div><div style="text-align:center;padding:16px"><p style="font-size:11px;color:rgba(255,255,255,0.25);margin:0">dalaman.me · <a href="${APP_URL}" style="color:rgba(255,255,255,0.35);text-decoration:none">${APP_URL}</a></p></div></div></div></body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    // Service-role client: full access, bypasses RLS. Because it is so
    // powerful, every privileged action below MUST be gated on the caller
    // being a verified admin (see the authorization check next).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // --- AUTHORIZATION -------------------------------------------------
    // verify_jwt only proves the bearer is a valid project JWT — and the
    // public anon key qualifies, so it is NOT proof of identity. We must
    // resolve the bearer to a real user and confirm they are an admin.
    // Passing the anon key (no user) -> getUser() fails -> 401.
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const { data: { user }, error: userErr } = await supabase.auth.getUser(token)
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { data: caller } = await supabase
      .from('users').select('role').eq('id', user.id).single()
    if (!caller || caller.role !== 'admin') {
      return json({ error: 'Forbidden — admin access required' }, 403)
    }
    // --- end authorization ---------------------------------------------

    const body = await req.json()
    const { email, full_name, phone, role, company_name, contact_name, is_approved, description } = body

    // Direct password reset (admin-initiated)
    if (body.action === 'reset_password') {
      const { userId, password } = body
      if (!userId || !password) return json({ error: 'userId and password required' }, 400)
      const { error } = await supabase.auth.admin.updateUserById(userId, { password })
      if (error) return json({ error: error.message }, 400)
      return json({ success: true })
    }

    if (!email) return json({ error: 'email is required' }, 400)

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email, email_confirm: true,
      user_metadata: { full_name: full_name || company_name || '' },
    })
    if (authErr) return json({ error: authErr.message }, 400)

    const userId = authData.user.id

    await supabase.from('users').upsert({
      id: userId, email,
      full_name: full_name || contact_name || null,
      phone: phone || null,
      role: role || 'customer',
    })

    if (role === 'provider' && company_name) {
      await supabase.from('providers').insert({
        user_id: userId, company_name,
        contact_name: contact_name || null,
        phone: phone || null,
        description: description || null,
        is_approved: is_approved === 'true' || is_approved === true,
        is_subcontractor: false, avg_rating: 0, total_reviews: 0,
      })
    }

    const { data: linkData } = await supabase.auth.admin.generateLink({
      type: 'magiclink', email,
      options: { redirectTo: `${APP_URL}/auth/reset/?new_user=true` },
    })

    if (linkData?.properties?.action_link) {
      const name = full_name || contact_name || company_name || email
      await sendEmail(email, 'Your dalaman.me provider account — set your password', welcomeEmail(name, linkData.properties.action_link))
    }

    return json({ success: true, userId })
  } catch (err: any) {
    console.error('Error:', err.message)
    return json({ error: err.message }, 500)
  }
})
