export function safeRedirect(value: string | null): string {
  // URLSearchParams already decodes the value; do not decode a second time.
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(value)) return '/'
  return value
}
