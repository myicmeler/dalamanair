export function serverKeys() {
  let configured: Record<string, string> = {}
  try {
    const parsed = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) configured = parsed
  } catch { /* Legacy setup. */ }
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  const values = [...Object.values(configured), legacy].filter(v => typeof v === 'string' && v.length > 0)
  return { admin: (typeof configured.default === 'string' && configured.default) || legacy || values[0], values }
}

export function isServerRequest(req: Request, keys: string[]): boolean {
  const bearer = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  const apikey = req.headers.get('apikey') ?? ''
  return keys.some(key => key.length > 0 && (key === bearer || key === apikey))
}
