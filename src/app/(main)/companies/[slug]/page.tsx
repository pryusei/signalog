import Link from 'next/link'
import { notFound } from 'next/navigation'
import { desc, eq, and } from 'drizzle-orm'

import { FollowButton } from '@/components/FollowButton'
import { ArticleCard } from '@/components/ArticleCard'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { articles, companies, follows } from '../../../../../db/schema'
import type { ArticleWithCompany } from '@/app/api/feed/route'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ type?: string }>
}

type FeedType = 'tech' | 'press' | 'all'

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params
  const [company] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
  if (!company) return { title: '企業が見つかりません | Signalog' }
  return { title: `${company.name} | Signalog` }
}

export default async function CompanyPage({ params, searchParams }: PageProps) {
  const { slug } = await params
  const { type: typeParam } = await searchParams
  const type: FeedType = typeParam === 'tech' || typeParam === 'press' ? typeParam : 'all'

  const [company] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1)
  if (!company) notFound()

  const session = await auth()
  const userId = session?.user.id ?? null

  const [articleRows, followedRows] = await Promise.all([
    db
      .select({
        id: articles.id,
        title: articles.title,
        sourceUrl: articles.sourceUrl,
        ogpImageUrl: articles.ogpImageUrl,
        publishedAt: articles.publishedAt,
        feedType: articles.feedType,
      })
      .from(articles)
      .where(
        type !== 'all'
          ? and(eq(articles.companyId, company.id), eq(articles.feedType, type))
          : eq(articles.companyId, company.id),
      )
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(50),
    userId
      ? db
          .select({ companyId: follows.companyId })
          .from(follows)
          .where(and(eq(follows.userId, userId), eq(follows.companyId, company.id)))
      : Promise.resolve([]),
  ])

  const isFollowed = followedRows.length > 0

  const companyArticles: ArticleWithCompany[] = articleRows.map((a) => ({
    id: a.id,
    title: a.title,
    sourceUrl: a.sourceUrl,
    ogpImageUrl: a.ogpImageUrl,
    publishedAt: a.publishedAt.toISOString(),
    feedType: a.feedType,
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
      logoUrl: company.logoUrl,
    },
  }))

  const tabs: { label: string; value: FeedType }[] = [
    { label: 'すべて', value: 'all' },
    { label: 'Tech Blog', value: 'tech' },
    { label: 'プレスリリース', value: 'press' },
  ]

  function tabHref(t: FeedType) {
    return `/companies/${slug}${t !== 'all' ? `?type=${t}` : ''}`
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      {/* Back link */}
      <Link
        href="/discover"
        className="text-sg-ink-soft hover:text-sg-ink mb-4 inline-flex items-center gap-1 text-sm"
      >
        ← 企業を探す
      </Link>

      {/* Company header card */}
      <section className="border-sg-line bg-sg-surface mb-6 flex items-center gap-4 rounded-2xl border p-6">
        {company.logoUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={company.logoUrl}
            alt={company.name}
            width={56}
            height={56}
            className="h-14 w-14 shrink-0 rounded-xl object-contain"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        ) : (
          <div className="bg-sg-accent-soft text-sg-accent-deep flex h-14 w-14 shrink-0 items-center justify-center rounded-xl text-lg font-black">
            {company.name.slice(0, 2)}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-sg-ink text-xl font-black">{company.name}</h1>
          {company.description && (
            <p className="text-sg-ink-soft mt-0.5 text-sm">{company.description}</p>
          )}
        </div>
        {userId ? (
          <FollowButton companyId={company.id} initialFollowed={isFollowed} />
        ) : (
          <Link
            href="/login"
            className="bg-sg-accent hover:bg-sg-accent-deep shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-white"
          >
            ＋ フォロー
          </Link>
        )}
      </section>

      {/* Tab filters */}
      <div className="mb-5 flex gap-2">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={tabHref(tab.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              type === tab.value
                ? 'bg-sg-accent-soft text-sg-accent-deep font-semibold'
                : 'border-sg-line bg-sg-surface text-sg-ink-soft hover:bg-sg-line-soft border'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Article list */}
      {companyArticles.length === 0 ? (
        <div className="border-sg-line bg-sg-surface rounded-2xl border py-16 text-center">
          <p className="text-sg-ink-soft">記事がまだありません</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {companyArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  )
}
