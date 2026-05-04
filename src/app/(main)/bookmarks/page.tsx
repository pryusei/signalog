import Link from 'next/link'
import { redirect } from 'next/navigation'
import { desc, eq } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { ArticleCard } from '@/components/ArticleCard'
import { articles, bookmarks, companies } from '../../../../db/schema'
import type { ArticleWithCompany } from '@/app/api/feed/route'

export const metadata = {
  title: 'ブックマーク',
  description: 'ブックマークした記事一覧',
}

export default async function BookmarksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')

  const userId = session.user.id

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
    .from(bookmarks)
    .innerJoin(articles, eq(bookmarks.articleId, articles.id))
    .innerJoin(companies, eq(articles.companyId, companies.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt))
    .limit(100)

  const savedArticles: ArticleWithCompany[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    sourceUrl: row.sourceUrl,
    ogpImageUrl: row.ogpImageUrl,
    publishedAt: row.publishedAt.toISOString(),
    feedType: row.feedType,
    aiSummary: row.aiSummary,
    bookmarkCount: row.bookmarkCount,
    isBookmarked: true,
    company: {
      id: row.companyId,
      name: row.companyName,
      slug: row.companySlug,
      logoUrl: row.companyLogoUrl,
    },
  }))

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-sg-ink mb-1 text-xl font-black md:text-2xl">ブックマーク</h1>
      <p className="text-sg-ink-soft mb-6 text-sm">保存した記事 {savedArticles.length}件</p>

      {savedArticles.length === 0 ? (
        <div className="border-sg-line bg-sg-surface rounded-2xl border py-20 text-center">
          <p className="text-sg-ink-soft mb-3">ブックマークした記事がありません</p>
          <Link
            href="/feed"
            className="bg-sg-accent hover:bg-sg-accent-deep inline-flex items-center gap-1 rounded-full px-5 py-2 text-sm font-semibold text-white"
          >
            フィードを見る →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {savedArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}
    </main>
  )
}
