export const QUOTE_DRAFT_KEY = 'dalaman-quote-draft-v1'
const MAX_AGE = 24 * 60 * 60 * 1000

export type QuoteDraft = {
  form: Record<string, string>
  isReturn: boolean
  currency: 'EUR' | 'GBP'
  phoneCountry: string
  phoneNumber: string
  willingToShare: boolean
  requestId: string
}

type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>

export function saveQuoteDraft(storage: Storage, draft: QuoteDraft): boolean {
  try {
    storage.setItem(QUOTE_DRAFT_KEY, JSON.stringify({ savedAt: Date.now(), draft }))
    return true
  } catch { return false }
}

export function readQuoteDraft(storage: Storage): QuoteDraft | null {
  try {
    const raw = storage.getItem(QUOTE_DRAFT_KEY)
    if (!raw) return null
    const { savedAt, draft } = JSON.parse(raw)
    if (typeof savedAt !== 'number' || savedAt > Date.now() || Date.now() - savedAt > MAX_AGE
      || !draft || !draft.form || typeof draft.form !== 'object' || Array.isArray(draft.form)
      || Object.values(draft.form).some(v => typeof v !== 'string' || v.length > 10000)
      || !['EUR', 'GBP'].includes(draft.currency)
      || typeof draft.isReturn !== 'boolean' || typeof draft.willingToShare !== 'boolean'
      || typeof draft.phoneCountry !== 'string' || typeof draft.phoneNumber !== 'string'
      || typeof draft.requestId !== 'string'
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(draft.requestId)) {
      storage.removeItem(QUOTE_DRAFT_KEY)
      return null
    }
    return draft
  } catch { return null }
}

export function clearQuoteDraft(storage: Storage): void {
  try { storage.removeItem(QUOTE_DRAFT_KEY) } catch { /* Storage may be unavailable. */ }
}
