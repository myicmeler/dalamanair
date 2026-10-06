import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'

let db
const customer = '10000000-0000-4000-8000-000000000001'
const provider = '20000000-0000-4000-8000-000000000001'
const request = '30000000-0000-4000-8000-000000000001'
const migration = await readFile(new URL('../supabase/provider-notification-queue.sql', import.meta.url), 'utf8')
const insertQuote = () => db.query('INSERT INTO quote_requests(id, customer_id, status) VALUES ($1, $2, $3)', [request, customer, 'open'])
const claim = async () => (await db.query('SELECT * FROM claim_provider_notification_jobs(5)')).rows
const finish = async (job, outcome = 'sent', token = job.lease_token) => (await db.query('SELECT finish_provider_notification_job($1, $2, $3, $4) AS done', [job.id, token, outcome, outcome === 'retry' ? 'Email service returned HTTP 503' : null])).rows[0].done

before(async () => {
  db = new PGlite()
  await db.exec(`
    CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
    CREATE TABLE users (id uuid PRIMARY KEY, email text);
    CREATE TABLE providers (id uuid PRIMARY KEY, user_id uuid REFERENCES users, is_approved boolean);
    CREATE TABLE quote_requests (id uuid PRIMARY KEY, customer_id uuid, status text);
    CREATE TABLE quote_offers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), request_id uuid, provider_id uuid);
  `)
  await db.exec(migration)
  await db.exec(migration) // Running the migration twice must be safe.
})
after(async () => { await db?.close() })
beforeEach(async () => {
  await db.exec('TRUNCATE provider_notification_jobs, quote_requests, quote_offers, providers, users CASCADE')
  await db.query('INSERT INTO users VALUES ($1, $2)', [customer, 'test@example.invalid'])
  await db.query('INSERT INTO providers VALUES ($1, $2, true)', [provider, customer])
})

test('quote insertion queues providers atomically and rolls back jobs if the transaction fails', async () => {
  await db.exec('BEGIN')
  await insertQuote()
  assert.equal((await db.query('SELECT * FROM provider_notification_jobs')).rows.length, 1)
  await db.exec('ROLLBACK')
  assert.equal((await db.query('SELECT * FROM provider_notification_jobs')).rows.length, 0)
  assert.equal((await db.query('SELECT * FROM quote_requests')).rows.length, 0)
})

test('only approved providers with addresses are queued; initial retries do not duplicate jobs', async () => {
  await db.exec(`INSERT INTO users VALUES ('10000000-0000-4000-8000-000000000002', ''), ('10000000-0000-4000-8000-000000000003', 'unapproved@example.invalid');
    INSERT INTO providers VALUES ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', true),
    ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', false);`)
  await insertQuote()
  await db.query('SELECT enqueue_provider_notifications($1, false)', [request])
  assert.equal((await db.query('SELECT * FROM provider_notification_jobs')).rows.length, 1)
  await db.query('SELECT enqueue_provider_notifications($1, true)', [request])
  assert.equal((await db.query('SELECT * FROM provider_notification_jobs')).rows.length, 2)
})

test('overlapping claims cannot take an active job; only its owner can finish it', async () => {
  await insertQuote()
  const [job] = await claim()
  assert.deepEqual(await claim(), [])
  assert.equal(await finish(job, 'sent', '00000000-0000-4000-8000-000000000000'), false)
  assert.equal(await finish(job), true)
  assert.deepEqual(await claim(), [])
  assert.equal((await db.query('SELECT status FROM provider_notification_jobs')).rows[0].status, 'sent')
})

test('failed delivery uses increasing delays and stops after five attempts', async () => {
  await insertQuote()
  for (let attempt = 1; attempt <= 5; attempt++) {
    const [job] = await claim()
    assert.equal(job.attempts, attempt)
    assert.equal(await finish(job, 'retry'), true)
    const { rows: [state] } = await db.query('SELECT status, extract(epoch FROM (available_at - now()))::integer AS delay FROM provider_notification_jobs')
    assert.equal(state.status, attempt < 5 ? 'pending' : 'failed')
    assert.ok(state.delay >= [0, 60, 300, 900, 3600, 3600][attempt] - 2)
    assert.deepEqual(await claim(), [])
    await db.exec("UPDATE provider_notification_jobs SET available_at = now() - interval '1 minute'")
  }
  assert.deepEqual(await claim(), [])
})

test('crashed workers are reclaimed and stale lease completions are rejected', async () => {
  await insertQuote()
  const [oldJob] = await claim()
  await db.exec("UPDATE provider_notification_jobs SET lease_until = now() - interval '1 minute'")
  const [reclaimed] = await claim()
  assert.equal(reclaimed.id, oldJob.id)
  assert.equal(reclaimed.attempts, 2)
  assert.notEqual(reclaimed.lease_token, oldJob.lease_token)
  assert.equal(await finish(oldJob), false)
  assert.equal(await finish(reclaimed, 'skipped'), true)
})

test('browser roles cannot read jobs or invoke delivery RPCs', async () => {
  for (const role of ['anon', 'authenticated']) {
    await db.exec(`SET ROLE ${role}`)
    await assert.rejects(db.query('SELECT * FROM provider_notification_jobs'), /permission denied/)
    await assert.rejects(db.query('SELECT * FROM claim_provider_notification_jobs(5)'), /permission denied/)
    await assert.rejects(db.query('SELECT enqueue_provider_notifications($1, true)', [request]), /permission denied/)
    await db.exec('RESET ROLE')
  }
})
