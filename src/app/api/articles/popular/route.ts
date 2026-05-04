import { and, desc, eq, gte, inArray } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { articles, bookmarks, companies } from '../../../../../db/schema'
import type { ArticleWithCompany } from '@/app/api/feed/route'

const LIMIT = 20
// 30日以内の記事を対象にする
const RECENCY_DAYS = 30

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') as 'tech' | 'press' | null

  const session = await auth()
  const userId = session?.user?.id ?? null

  const since = new Date(Date.now() - RECENCY_DAYS * 24 * 60 * 60 * 1000)

  const conditions = [gte(articles.publishedAt, since)]
  if (type === 'tech' || type === 'press') {
    conditions.push(eq(articles.feedType, type))
  }

  const rows = await db
    .select({
      id: articles.id,
      title: articles.title,
      sourceUrl: articles.sourceUrl,
      ogpImageUrl: articles.ogpImageUrl,
      publishedAt: articles.publishedAt,
      feedType: articles.feedType,
      aiSummary: articles.aiSummary,
      bookmarkCount: articles.bookmarkCount,
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
      companyLogoUrl: companies.logoUrl,
    })
    .from(articles)
    .innerJoin(companies, eq(articles.companyId, companies.id))
    .where(and(...conditions))
    .orderBy(desc(articles.bookmarkCount), desc(articles.publishedAt))
    .limit(LIMIT)

  let bookmarkedIds = new Set<string>()
  if (userId && rows.length > 0) {
    const bRows = await db
      .select({ articleId: bookmarks.articleId })
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          inArray(
            bookmarks.articleId,
            rows.map((r) => r.id),
          ),
        ),
      )
    bookmarkedIds = new Set(bRows.map((r) => r.articleId))
  }

  const result: ArticleWithCompany[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    sourceUrl: row.sourceUrl,
    ogpImageUrl: row.ogpImageUrl,
    publishedAt: row.publishedAt.toISOString(),
    feedType: row.feedType,
    aiSummary: row.aiSummary,
    bookmarkCount: row.bookmarkCount,
    isBookmarked: bookmarkedIds.has(row.id),
    company: {
      id: row.companyId,
      name: row.companyName,
      slug: row.companySlug,
      logoUrl: row.companyLogoUrl,
    },
  }))

  return Response.json({ data: result })
}
