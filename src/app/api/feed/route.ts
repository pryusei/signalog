import { and, desc, eq, inArray, lt, or } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

import { auth } from '@/lib/auth'
import { decodeCursor, encodeCursor } from '@/lib/cursor'
import { db } from '@/lib/db/server'
import { articles, companies, follows } from '../../../../db/schema'

const DEFAULT_LIMIT = 20
const MAX_LIMIT = 50

export interface ArticleWithCompany {
  id: string
  title: string
  sourceUrl: string
  ogpImageUrl: string | null
  publishedAt: string
  feedType: 'tech' | 'press'
  company: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const cursorParam = searchParams.get('cursor')
  const limitParam = searchParams.get('limit')
  const type = searchParams.get('type') as 'tech' | 'press' | null
  const following = searchParams.get('following') === 'true'

  const limit = Math.min(Number(limitParam) || DEFAULT_LIMIT, MAX_LIMIT)
  const cursor = cursorParam ? decodeCursor(cursorParam) : null

  const session = await auth()
  const userId = session?.user?.id ?? null

  // フォロー中フィルタ: ログイン済みかつ following=true のとき
  let followedCompanyIds: string[] | null = null
  if (following && userId) {
    const rows = await db
      .select({ companyId: follows.companyId })
      .from(follows)
      .where(eq(follows.userId, userId))
    followedCompanyIds = rows.map((r) => r.companyId)
    // フォロー企業がない場合は空配列を返す
    if (followedCompanyIds.length === 0) {
      return Response.json({ data: [], nextCursor: null })
    }
  }

  const conditions = []

  if (followedCompanyIds) {
    conditions.push(inArray(articles.companyId, followedCompanyIds))
  }

  if (type === 'tech' || type === 'press') {
    conditions.push(eq(articles.feedType, type))
  }

  if (cursor) {
    const cursorDate = new Date(cursor.publishedAt)
    conditions.push(
      or(
        lt(articles.publishedAt, cursorDate),
        and(eq(articles.publishedAt, cursorDate), lt(articles.id, cursor.id)),
      ),
    )
  }

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      sourceUrl: articles.sourceUrl,
      ogpImageUrl: articles.ogpImageUrl,
      publishedAt: articles.publishedAt,
      feedType: articles.feedType,
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
      companyLogoUrl: companies.logoUrl,
    })
    .from(articles)
    .innerJoin(companies, eq(articles.companyId, companies.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit + 1)

  const hasMore = rows.length > limit
  const data = rows.slice(0, limit)

  const nextCursor =
    hasMore && data.length > 0
      ? encodeCursor({
          publishedAt: data[data.length - 1].publishedAt.toISOString(),
          id: data[data.length - 1].id,
        })
      : null

  const result: ArticleWithCompany[] = data.map((row) => ({
    id: row.id,
    title: row.title,
    sourceUrl: row.sourceUrl,
    ogpImageUrl: row.ogpImageUrl,
    publishedAt: row.publishedAt.toISOString(),
    feedType: row.feedType,
    company: {
      id: row.companyId,
      name: row.companyName,
      slug: row.companySlug,
      logoUrl: row.companyLogoUrl,
    },
  }))

  return Response.json({ data: result, nextCursor })
}
