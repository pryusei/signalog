export async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      signal: AbortSignal.timeout(5_000),
      headers: { 'User-Agent': 'SignalogBot/1.0 (+https://signalog.app/bot)' },
    })
    if (!res.ok) return null

    const html = await res.text()
    const match =
      html.match(/<meta\s+[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["']/i) ??
      html.match(/<meta\s+[^>]*content=["']([^"']+)["'][^>]*property=["']og:image["']/i)
    return match?.[1] ?? null
  } catch {
    return null
  }
}
