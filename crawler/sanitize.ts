import DOMPurify from 'isomorphic-dompurify'

export function sanitizeTitle(raw: string): string {
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
}
