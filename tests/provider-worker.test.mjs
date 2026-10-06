import { test, beforeEach, after } from 'node:test'
import assert from 'node:assert/strict'

const env = new Map([
  ['SUPABASE_SERVICE_ROLE_KEY', 'test-server-key'],
  ['SUPABASE_URL', 'https://example.invalid'],
  ['MAILGUN_API_KEY', 'test-mail-key'],
])
globalThis.Deno = { env: { get: key => env.get(key) } }
const { createNotificationHandler } = await import('../supabase/functions/provider-notification-worker/handler.ts')
const originalFetch = globalThis.fetch
after(() => { globalThis.fetch = originalFetch; delete globalThis.Deno })

let outcomes, claims, mailCalls
const job = { id: 'job-1', lease_token: 'lease-1', request_id: 'request-1', provider_id: 'provider-1' }
const quote = {
  status: 'open', expires_at: '2099-01-01T00:00:00Z', pickup_time: '2098-12-01T14:00:00Z',
  pickup: { name: 'Airport' }, dropoff: { name: 'Hotel' }, passengers: 2,
  notes: '<img src=x onerror=alert(1)>',
}
const database = (options = {}) => ({
  async rpc(name, args) {
    if (name === 'claim_provider_notification_jobs') { claims++; return { data: [job], error: null } }
    if (name === 'finish_provider_notification_job') { outcomes.push(args); return { data: true, error: null } }
    throw Error(`Unexpected RPC ${name}`)
  },
  from(table) {
    const chain = {
      select() { return chain }, eq() { return chain },
      async maybeSingle() {
        if (options.databaseError) return { data: null, error: Error('Database unavailable') }
        return { data: table === 'quote_requests' ? { ...quote, ...options.quote } : { is_approved: options.approved ?? true, user: { email: 'test@example.invalid' } }, error: null }
      },
      async limit() { return { data: options.hasOffer ? [{ id: 'offer-1' }] : [], error: null } },
    }
    return chain
  },
})
const invoke = (options, key = 'test-server-key') => createNotificationHandler(() => database(options))(
  new Request('https://example.invalid/worker', { method: 'POST', headers: { apikey: key } }),
)

beforeEach(() => {
  outcomes = []; claims = 0; mailCalls = 0
  env.set('MAILGUN_API_KEY', 'test-mail-key')
  globalThis.fetch = async (_url, init) => {
    mailCalls++
    assert.ok(init.body.get('html').includes('&lt;img src=x onerror=alert(1)&gt;'))
    assert.equal(init.body.get('v:notification_job_id'), job.id)
    return new Response('{}', { status: 200 })
  }
})

test('worker rejects browser credentials without claiming jobs', async () => {
  const result = await invoke({}, 'public-anon-key')
  assert.equal(result.status, 401)
  assert.equal(claims, 0)
  assert.equal(mailCalls, 0)
})

test('unconfigured email does not consume job attempts', async () => {
  env.delete('MAILGUN_API_KEY')
  assert.equal((await invoke({})).status, 503)
  assert.equal(claims, 0)
})

test('successful delivery records the owned lease as sent', async () => {
  assert.deepEqual(await (await invoke({})).json(), { sent: 1, retried: 0, skipped: 0 })
  assert.equal(outcomes[0].p_outcome, 'sent')
  assert.equal(outcomes[0].p_lease_token, job.lease_token)
  assert.equal(mailCalls, 1)
})

test('HTTP and network failures record a retry without marking sent', async () => {
  for (const fail of [() => new Response('private provider error', { status: 503 }), () => { throw Error('Connection lost') }]) {
    globalThis.fetch = async () => fail()
    const result = await invoke({})
    assert.equal(result.status, 200)
    assert.equal(outcomes.at(-1).p_outcome, 'retry')
    assert.ok(!outcomes.at(-1).p_error.includes('private provider error'))
  }
})

test('closed or expired quotes, unapproved providers and existing offers are skipped', async () => {
  for (const options of [{ quote: { status: 'cancelled' } }, { quote: { expires_at: '2000-01-01T00:00:00Z' } }, { approved: false }, { hasOffer: true }]) {
    await invoke(options)
    assert.equal(outcomes.at(-1).p_outcome, 'skipped')
  }
  assert.equal(mailCalls, 0)
})

test('database read failures retry rather than silently skip', async () => {
  await invoke({ databaseError: true })
  assert.equal(outcomes[0].p_outcome, 'retry')
  assert.equal(mailCalls, 0)
})
