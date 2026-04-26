const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'source',
]

export function normalizeUrl(input: string): string {
  const url = new URL(input)

  if (url.protocol === 'http:') url.protocol = 'https:'

  url.hash = ''

  for (const param of TRACKING_PARAMS) {
    url.searchParams.delete(param)
  }

  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }

  return url.toString()
}
