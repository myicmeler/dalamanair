import { serverKeys, isServerRequest } from '../_shared/server-auth.ts'
import { emailHtml } from '../_shared/provider-email.ts'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json' },
})

export function createNotificationHandler(createClient: (url: string, key: string) => any) {
  return async (req: Request): Promise<Response> => {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)
    const keys = serverKeys()
    if (!keys.admin || !isServerRequest(req, keys.values)) return json({ error: 'Unauthorized' }, 401)
    const mailgunKey = Deno.env.get('MAILGUN_API_KEY') ?? ''
    // Do not consume attempts while the email service is not configured.
    if (!mailgunKey) return json({ error: 'Email service not configured' }, 503)
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', keys.admin)
    try {
      const { data: jobs, error } = await supabase.rpc('claim_provider_notification_jobs', { p_limit: 5 })
      if (error) throw error
      let sent = 0, retried = 0, skipped = 0
      for (const job of jobs ?? []) {
        let outcome = 'retry'
        let deliveryError: string | null = null
        try {
          const { data: request, error: requestError } = await supabase.from('quote_requests')
            .select('*, pickup:locations!pickup_location_id(name), dropoff:locations!dropoff_location_id(name)')
            .eq('id', job.request_id).maybeSingle()
          if (requestError) throw requestError
          const { data: provider, error: providerError } = await supabase.from('providers')
            .select('is_approved, user:users!user_id(email)').eq('id', job.provider_id).maybeSingle()
          if (providerError) throw providerError
          const { data: offers, error: offerError } = await supabase.from('quote_offers')
            .select('id').eq('request_id', job.request_id).eq('provider_id', job.provider_id).limit(1)
          if (offerError) throw offerError
          const email = (provider?.user as any)?.email
          if (!request || request.status !== 'open' || new Date(request.expires_at) <= new Date()
            || !provider?.is_approved || !email || offers?.length) {
            outcome = 'skipped'
          } else {
            const date = new Date(request.pickup_time).toLocaleDateString('en-GB', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
            })
            const form = new FormData()
            form.append('from', Deno.env.get('MAILGUN_FROM') ?? 'dalaman.me <post@dalaman.me>')
            form.append('to', email)
            form.append('subject', `New quote request: ${request.pickup?.name} → ${request.dropoff?.name} · ${date}`)
            form.append('html', emailHtml(request))
            form.append('o:tag', 'notify-providers')
            form.append('v:notification_job_id', job.id)
            const response = await fetch(`https://api.eu.mailgun.net/v3/${Deno.env.get('MAILGUN_DOMAIN') ?? 'mg.dalaman.me'}/messages`, {
              method: 'POST', headers: { Authorization: `Basic ${btoa('api:' + mailgunKey)}` },
              body: form, signal: AbortSignal.timeout(15000),
            })
            if (!response.ok) throw new Error(`Email service returned HTTP ${response.status}`)
            outcome = 'sent'
          }
        } catch (err) {
          // Keep recipient addresses, email contents and provider response bodies
          // out of the persisted diagnostic; the job ID is enough to trace it.
          deliveryError = err instanceof Error && err.message.startsWith('Email service returned HTTP')
            ? err.message : 'Delivery failed; retry scheduled'
          console.error('Provider delivery failed for job', job.id)
        }
        const { data: finished, error: finishError } = await supabase.rpc('finish_provider_notification_job', {
          p_job_id: job.id, p_lease_token: job.lease_token, p_outcome: outcome, p_error: deliveryError,
        })
        if (finishError || !finished) throw finishError ?? new Error('Job lease no longer owned')
        if (outcome === 'sent') sent++
        else if (outcome === 'skipped') skipped++
        else retried++
      }
      return json({ sent, retried, skipped })
    } catch (err) {
      console.error('Notification worker failed:', err)
      return json({ error: 'Notification worker failed; unfinished leases will be retried' }, 500)
    }
  }
}
