import Link from 'next/link'
import { and, desc, eq, gte, inArray } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { ArticleCard } from '@/components/ArticleCard'
import { articles, bookmarks, companies } from '../../../../db/schema'
import type { ArticleWithCompany } from '@/app/api/feed/route'

export const metadata = {
  title: '人気記事',
  description: '直近30日間でブックマークが多い人気記事',
}

type FeedType = 'tech' | 'press' | 'all'

interface PageProps {
  searchParams: Promise<{ type?: string }>
}

const RECENCY_DAYS = 30

export default async function PopularPage({ searchParams }: PageProps) {
  const { type: typeParam } = await searchParams
  const type: FeedType = typeParam === 'tech' || typeParam === 'press' ? typeParam : 'all'

  const session = await auth()
  const userId = session?.user?.id ?? null

  // eslint-disable-next-line react-hooks/purity -- Server Component では Date.now() は安全
  const since = new Date(Date.now() - RECENCY_DAYS * 24 * 60 * 60 * 1000)

  const conditions = [gte(articles.publishedAt, since)]
  if (type !== 'all') {
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
    .limit(30)

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

  const popularArticles: ArticleWithCompany[] = rows.map((row) => ({
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

  const tabs: { label: string; value: FeedType }[] = [
    { label: 'すべて', value: 'all' },
    { label: 'Tech Blog', value: 'tech' },
    { label: 'プレスリリース', value: 'press' },
  ]

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-sg-ink mb-1 text-xl font-black md:text-2xl">人気記事</h1>
      <p className="text-sg-ink-soft mb-5 text-sm">直近30日間でブックマークが多い記事</p>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-0.5">
        {tabs.map((tab) => {
          const href = tab.value === 'all' ? '/popular' : `/popular?type=${tab.value}`
          return (
            <Link
              key={tab.value}
              href={href}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                type === tab.value
                  ? 'bg-sg-accent-soft text-sg-accent-deep font-semibold'
                  : 'border-sg-line bg-sg-surface text-sg-ink-soft hover:bg-sg-line-soft border'
              }`}
            >
              {tab.label}
            </Link>
          )
        })}
      </div>

      {popularArticles.length === 0 ? (
        <div className="border-sg-line bg-sg-surface rounded-2xl border py-20 text-center">
          <p className="text-sg-ink-soft">まだブックマークされた記事がありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {popularArticles.map((article, i) => (
            <div key={article.id} className="flex items-start gap-3">
              <span className="text-sg-ink-faint mt-5 w-6 shrink-0 text-center text-xs font-bold">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <ArticleCard article={article} />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
