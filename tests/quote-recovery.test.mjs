import test from 'node:test'
import assert from 'node:assert/strict'
import { QUOTE_DRAFT_KEY, saveQuoteDraft, readQuoteDraft, clearQuoteDraft } from '../lib/quote-draft.ts'
import { safeRedirect } from '../lib/auth-redirect.ts'
import { requireFunctionSuccess } from '../lib/function-response.ts'

const storage = () => {
  const items = new Map()
  return { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: key => items.delete(key) }
}
const draft = {
  form: { pickup: 'airport', dropoff: 'hotel', date: '2026-12-01', time: '14:00', passengers: '4', luggage: '3', hotelName: 'My Hotel', flightNumber: 'TEST123', notes: 'Child seat', returnDate: '2026-12-08', returnTime: '10:00', returnPickup: 'hotel', returnDropoff: 'airport', returnPassengers: '4', returnLuggage: '3', returnFlightNumber: 'TEST456', returnNotes: 'Meet in lobby' },
  isReturn: true, currency: 'GBP', phoneCountry: 'NO', phoneNumber: '12345678', willingToShare: true,
  requestId: '12345678-1234-4567-8910-123456789012',
}

test('authentication round trip restores all details and the retry ID; success clears them', () => {
  const originalTab = storage()
  assert.equal(saveQuoteDraft(originalTab, draft), true)
  assert.deepEqual(readQuoteDraft(originalTab), draft)
  clearQuoteDraft(originalTab)
  assert.equal(readQuoteDraft(originalTab), null)
})

test('expired, malformed, or invalid drafts do not enter the form', () => {
  const tab = storage()
  for (const raw of ['not-json', JSON.stringify({ savedAt: Date.now() - 25 * 3600000, draft }), JSON.stringify({ savedAt: Date.now(), draft: { ...draft, form: { date: 12 } } })]) {
    tab.setItem(QUOTE_DRAFT_KEY, raw)
    assert.equal(readQuoteDraft(tab), null)
  }
})

test('blocked storage is handled without abandoning the form', () => {
  const blocked = { getItem() { throw Error('blocked') }, setItem() { throw Error('blocked') }, removeItem() { throw Error('blocked') } }
  assert.equal(saveQuoteDraft(blocked, draft), false)
  assert.equal(readQuoteDraft(blocked), null)
  assert.doesNotThrow(() => clearQuoteDraft(blocked))
})

test('the resume destination survives auth redirects; external destinations are rejected', () => {
  const destination = '/quote/?resume=1'
  const query = new URLSearchParams({ redirect: destination })
  assert.equal(safeRedirect(query.get('redirect')), destination)
  for (const unsafe of ['https://example.com', '//example.com', '/\\example.com', '/\n/example.com', null]) assert.equal(safeRedirect(unsafe), '/')
})

test('HTTP errors reject instead of masquerading as successful notifications', async () => {
  for (const status of [401, 403, 429, 500, 503]) {
    await assert.rejects(requireFunctionSuccess(new Response('private server detail', { status })), new RegExp(`HTTP ${status}`))
  }
  const response = new Response(JSON.stringify({ queued: 3 }), { status: 202 })
  assert.equal(await requireFunctionSuccess(response), response)
  assert.deepEqual(await response.json(), { queued: 3 })
})
