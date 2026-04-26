import Link from 'next/link'
import { Suspense } from 'react'

import { auth } from '@/lib/auth'
import { encodeCursor } from '@/lib/cursor'
import { db } from '@/lib/db/server'
import { and, desc, eq, inArray } from 'drizzle-orm'
import { articles, companies, follows } from '../../../../db/schema'
import type { ArticleWithCompany } from '@/app/api/feed/route'
import { FeedInfiniteScroll } from './FeedInfiniteScroll'

export const metadata = { title: 'フィード | Signalog' }

const LIMIT = 20

interface PageProps {
  searchParams: Promise<{ type?: string; following?: string }>
}

type FeedType = 'tech' | 'press' | 'all'

export default async function FeedPage({ searchParams }: PageProps) {
  const { type: typeParam, following: followingParam } = await searchParams
  const type: FeedType = typeParam === 'tech' || typeParam === 'press' ? typeParam : 'all'

  const session = await auth()
  const userId = session?.user.id ?? null
  const following = followingParam !== 'false' && userId !== null

  let followedCompanyIds: string[] | null = null
  if (following && userId) {
    const rows = await db
      .select({ companyId: follows.companyId })
      .from(follows)
      .where(eq(follows.userId, userId))
    followedCompanyIds = rows.map((r) => r.companyId)
  }

  const conditions = []
  if (followedCompanyIds && followedCompanyIds.length > 0) {
    conditions.push(inArray(articles.companyId, followedCompanyIds))
  }
  if (type !== 'all') {
    conditions.push(eq(articles.feedType, type))
  }

  const rows =
    followedCompanyIds?.length === 0
      ? []
      : await db
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
          .limit(LIMIT + 1)

  const hasMore = rows.length > LIMIT
  const initialArticles: ArticleWithCompany[] = rows.slice(0, LIMIT).map((row) => ({
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

  const last = initialArticles[initialArticles.length - 1]
  const initialNextCursor =
    hasMore && last ? encodeCursor({ publishedAt: last.publishedAt, id: last.id }) : null

  const feedTabs: { label: string; value: FeedType }[] = [
    { label: 'すべて', value: 'all' },
    { label: 'Tech Blog', value: 'tech' },
    { label: 'プレスリリース', value: 'press' },
  ]

  function tabHref(t: FeedType) {
    const p = new URLSearchParams()
    if (t !== 'all') p.set('type', t)
    if (!following && userId) p.set('following', 'false')
    return `/feed${p.size > 0 ? `?${p}` : ''}`
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">フィード</h1>
        {userId && (
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm font-medium">
            <Link
              href={`/feed?${new URLSearchParams({ ...(type !== 'all' ? { type } : {}) })}`}
              className={`px-4 py-2 transition-colors ${
                following ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              フォロー中
            </Link>
            <Link
              href={`/feed?following=false${type !== 'all' ? `&type=${type}` : ''}`}
              className={`border-l border-gray-300 px-4 py-2 transition-colors ${
                !following ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              すべて
            </Link>
          </div>
        )}
      </div>

      <div className="mb-6 flex gap-2">
        {feedTabs.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              type === tab.value
                ? 'bg-gray-900 text-white shadow-sm'
                : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {initialArticles.length === 0 ? (
        <div className="py-20 text-center">
          <p className="mb-3 text-gray-500">
            {following ? 'フォロー中の企業の記事がまだありません' : '記事がまだありません'}
          </p>
          {following && (
            <Link
              href="/discover"
              className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-700"
            >
              企業をフォローする →
            </Link>
          )}
        </div>
      ) : (
        <Suspense>
          <FeedInfiniteScroll
            initialArticles={initialArticles}
            initialNextCursor={initialNextCursor}
            type={type}
            following={following}
          />
        </Suspense>
      )}
    </main>
  )
}
