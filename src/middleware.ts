import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function generateNonce(): string {
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Buffer.from(array).toString('base64')
}

function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

const RATE_LIMIT_WINDOW = 60 // seconds
const RATE_LIMIT_MAX = 60 // requests per window per IP

let limiter: import('@upstash/ratelimit').Ratelimit | null = null

async function getRateLimiter() {
  if (limiter) return limiter
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  limiter = new Ratelimit({
    redis: new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    }),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_MAX, `${RATE_LIMIT_WINDOW} s`),
    prefix: 'signalog:rl',
  })
  return limiter
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API ルートにレートリミットを適用
  if (pathname.startsWith('/api/')) {
    const rl = await getRateLimiter()
    if (rl) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? '127.0.0.1'
      const { success, limit, remaining, reset } = await rl.limit(ip)

      if (!success) {
        return new NextResponse(
          JSON.stringify({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': limit.toString(),
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': reset.toString(),
              'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
            },
          },
        )
      }
    }
  }

  // CSP nonce をすべてのページリクエストに付与
  const nonce = generateNonce()
  const csp = buildCsp(nonce)

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        'x-nonce': nonce,
      }),
    },
  })

  response.headers.set('Content-Security-Policy', csp)

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
