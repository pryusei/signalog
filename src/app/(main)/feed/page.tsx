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
  const userId = session?.user?.id ?? null
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
    <main className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-sg-ink mb-1 text-xl font-black md:text-2xl">フィード</h1>
      {userId && (
        <p className="text-sg-ink-soft mb-5 text-sm">
          {following ? 'フォロー中の企業の最新情報' : 'すべての企業の最新情報'}
        </p>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-2">
        {/* Type filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {feedTabs.map((tab) => (
            <Link
              key={tab.value}
              href={tabHref(tab.value)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                type === tab.value
                  ? 'bg-sg-accent-soft text-sg-accent-deep font-semibold'
                  : 'border-sg-line bg-sg-surface text-sg-ink-soft hover:bg-sg-line-soft border'
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        {/* Following toggle */}
        {userId && (
          <div className="flex justify-end gap-1">
            <Link
              href={`/feed?${new URLSearchParams({ ...(type !== 'all' ? { type } : {}) })}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                following
                  ? 'bg-sg-accent text-white'
                  : 'border-sg-line bg-sg-surface text-sg-ink-soft hover:bg-sg-line-soft border'
              }`}
            >
              フォロー中
            </Link>
            <Link
              href={`/feed?following=false${type !== 'all' ? `&type=${type}` : ''}`}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                !following
                  ? 'bg-sg-accent text-white'
                  : 'border-sg-line bg-sg-surface text-sg-ink-soft hover:bg-sg-line-soft border'
              }`}
            >
              すべて
            </Link>
          </div>
        )}
      </div>

      {initialArticles.length === 0 ? (
        <div className="border-sg-line bg-sg-surface rounded-2xl border py-20 text-center">
          <p className="text-sg-ink-soft mb-3">
            {following ? 'フォロー中の企業の記事がまだありません' : '記事がまだありません'}
          </p>
          {following && (
            <Link
              href="/discover"
              className="bg-sg-accent hover:bg-sg-accent-deep inline-flex items-center gap-1 rounded-full px-5 py-2 text-sm font-semibold text-white"
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
