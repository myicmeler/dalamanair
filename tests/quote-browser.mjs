import { chromium } from 'playwright-core'
import assert from 'node:assert/strict'
const browser = await chromium.launch({ executablePath: process.env.BROWSER_PATH ?? '/usr/bin/chromium', headless: true, args: ['--no-sandbox'] })
const context = await browser.newContext()
const page = await context.newPage()
const user = { id: '10000000-0000-4000-8000-000000000001', email: 'test@example.invalid', aud: 'authenticated', role: 'authenticated', user_metadata: { full_name: 'Test Customer' } }
const payload = Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now()/1000)+3600, aud: 'authenticated', role: 'authenticated' })).toString('base64url')
const token = `eyJhbGciOiJIUzI1NiJ9.${payload}.test`
const locations = [{ id: '20000000-0000-4000-8000-000000000001', name: 'Dalaman Airport', is_active: true }, { id: '20000000-0000-4000-8000-000000000002', name: 'Icmeler', is_active: true }]
let attempts = [], saved = null, failInsert = true, loseReply = false, notifyCalls = 0
const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' }
await page.route('http://127.0.0.1:54321/**', async route => {
  const req = route.request(), url = new URL(req.url())
  let status = 200, body = []
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
  if (url.pathname === '/auth/v1/token') body = { access_token: token, refresh_token: 'test-refresh', expires_in: 3600, token_type: 'bearer', user }
  else if (url.pathname === '/auth/v1/user') body = user
  else if (url.pathname === '/rest/v1/locations') body = locations
  else if (url.pathname === '/rest/v1/users') body = { ...user, role: 'customer', is_active: true, full_name: 'Test Customer' }
  else if (url.pathname === '/rest/v1/quote_requests' && req.method() === 'POST') {
    const quote = req.postDataJSON(); attempts.push(quote)
    if (failInsert) { status = 503; body = { message: 'Synthetic database outage', code: 'XX000' } }
    else if (saved) { status = 409; body = { message: 'Duplicate', code: '23505' } }
    else { saved = quote; body = quote; if (loseReply) { status = 503; body = { message: 'Lost insert response', code: 'XX000' }; loseReply = false } }
  } else if (url.pathname === '/rest/v1/quote_requests') body = saved ? { id: saved.id } : null
  else if (url.pathname === '/functions/v1/send-email') { status = 503; body = { error: 'Synthetic Mailgun outage' } }
  else if (url.pathname === '/functions/v1/notify-providers') { notifyCalls++; body = { queued: 1 } }
  await route.fulfill({ status, headers, contentType: 'application/json', body: JSON.stringify(body) })
})
try {
  await page.goto('http://127.0.0.1:3000/quote/')
  const wrap = page.locator('.quote-wrap')
  await wrap.locator('select').nth(0).selectOption(locations[0].id)
  await wrap.locator('select').nth(1).selectOption(locations[1].id)
  await wrap.locator('input[type=date]').fill('2098-12-01')
  await wrap.locator('input[type=time]').fill('15:30')
  await page.getByPlaceholder('TK 1234').fill('TEST123')
  await page.getByPlaceholder('e.g. Marti Resort, Içmeler').fill('Test Hotel')
  await page.getByPlaceholder('7700 900123').fill('7700900123')
  await page.getByPlaceholder('Child seat, wheelchair access...').fill('Child seat please')
  await page.getByRole('button', { name: 'British Pound' }).click()
  await page.getByRole('checkbox').click()
  await page.getByRole('button', { name: 'Request quotes' }).click()
  await page.waitForURL('**/auth/signin/**')
  assert.equal(new URL(page.url()).searchParams.get('redirect'), '/quote/?resume=1')
  const initial = await page.evaluate(() => JSON.parse(sessionStorage.getItem('dalaman-quote-draft-v1')).draft)
  assert.equal(initial.form.hotelName, 'Test Hotel')
  await page.getByRole('link', { name: 'Create an account' }).click()
  await page.waitForURL('**/auth/signup/**')
  assert.equal(new URL(page.url()).searchParams.get('redirect'), '/quote/?resume=1')
  await page.getByRole('link', { name: 'Sign in', exact: true }).click()
  await page.waitForURL('**/auth/signin/**')
  await page.getByPlaceholder('you@email.com').fill('test@example.invalid')
  await page.locator('input[type=password]').fill('synthetic-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL('**/quote/?resume=1')
  await page.getByRole('status').filter({ hasText: 'restored' }).waitFor()
  assert.equal(await page.getByPlaceholder('e.g. Marti Resort, Içmeler').inputValue(), 'Test Hotel')
  assert.equal(await page.getByPlaceholder('TK 1234').inputValue(), 'TEST123')
  assert.equal(await page.getByPlaceholder('Child seat, wheelchair access...').inputValue(), 'Child seat please')
  assert.equal(await page.getByRole('checkbox').getAttribute('aria-checked'), 'true')
  await page.getByRole('button', { name: 'Request quotes' }).click()
  await page.getByRole('alert').filter({ hasText: 'We could not confirm' }).waitFor()
  assert.equal(await page.getByPlaceholder('e.g. Marti Resort, Içmeler').inputValue(), 'Test Hotel')
  assert.equal(attempts.length, 1)
  failInsert = false
  await page.getByRole('button', { name: 'Request quotes' }).click()
  await page.getByRole('heading', { name: 'Quote request submitted' }).waitFor()
  assert.equal(attempts.length, 2)
  assert.equal(attempts[0].id, attempts[1].id)
  assert.equal(saved.currency, 'GBP')
  assert.equal(saved.willing_to_share, true)
  assert.equal(notifyCalls, 0)
  assert.equal(await page.evaluate(() => sessionStorage.getItem('dalaman-quote-draft-v1')), null)
  assert.ok((await page.locator('body').innerText()).includes('notifications are queued'))
  // Recover a committed quote even if its insert response is lost.
  saved = null
  loseReply = true
  initial.requestId = crypto.randomUUID()
  await page.evaluate(draft => sessionStorage.setItem('dalaman-quote-draft-v1', JSON.stringify({ savedAt: Date.now(), draft })), initial)
  await page.goto('http://127.0.0.1:3000/quote/?resume=1')
  await page.getByRole('status').filter({ hasText: 'restored' }).waitFor()
  await page.getByRole('button', { name: 'Request quotes' }).click()
  await page.getByRole('heading', { name: 'Quote request submitted' }).waitFor()
  assert.equal(attempts.length, 3)
  assert.equal(saved.id, initial.requestId)
  assert.equal(await page.getByRole('alert').filter({ hasText: 'We could not confirm' }).count(), 0)
  console.log('PASS: lost insert response recovers the saved request without another insert.')
  console.log('PASS: draft survives sign-in and signup links; errors retain details; retries reuse ID; email failure preserves success; provider delivery is independent of browser.')
} finally { await browser.close() }
