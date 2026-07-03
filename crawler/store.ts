import { and, eq, inArray, sql } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

import * as schema from '../db/schema'
import type { FeedItem } from './fetch'
import { fetchOgImage } from './og-image'
import { normalizeUrl } from './normalize'
import { sanitizeTitle } from './sanitize'

type CompanyFeed = InferSelectModel<typeof schema.companyFeeds>

export function createDb() {
  const sqlClient = neon(process.env.DATABASE_URL!)
  return drizzle(sqlClient, { schema })
}

type Db = ReturnType<typeof createDb>

export async function storeArticles(db: Db, feed: CompanyFeed, items: FeedItem[]): Promise<number> {
  const validItems = items.flatMap((item) => {
    // URL か pubDate が不正な記事はスキップし、フィード全体は失敗させない
    const publishedAt = new Date(item.pubDate)
    if (Number.isNaN(publishedAt.getTime())) return []
    try {
      return [{ item, normalized: normalizeUrl(item.link), publishedAt }]
    } catch {
      return []
    }
  })
  if (validItems.length === 0) return 0

  // 既存記事を除外してから OGP を取得する (毎クロールでの再取得を避ける)
  const existing = await db
    .select({ normalizedUrl: schema.articles.normalizedUrl })
    .from(schema.articles)
    .where(
      and(
        eq(schema.articles.companyId, feed.companyId),
        inArray(
          schema.articles.normalizedUrl,
          validItems.map((v) => v.normalized),
        ),
      ),
    )
  const existingUrls = new Set(existing.map((e) => e.normalizedUrl))
  const newItems = validItems.filter((v) => !existingUrls.has(v.normalized))
  if (newItems.length === 0) return 0

  // OGP 画像を並列取得
  const ogImages = await Promise.all(newItems.map(({ item }) => fetchOgImage(item.link)))

  let newCount = 0
  for (let i = 0; i < newItems.length; i++) {
    const { item, normalized, publishedAt } = newItems[i]
    const result = await db
      .insert(schema.articles)
      .values({
        companyId: feed.companyId,
        feedType: feed.feedType,
        title: sanitizeTitle(item.title),
        sourceUrl: item.link,
        normalizedUrl: normalized,
        ogpImageUrl: ogImages[i],
        publishedAt,
      })
      .onConflictDoNothing()
      .returning({ id: schema.articles.id })

    if (result.length > 0) newCount++
  }

  return newCount
}

export async function markFeedSuccess(db: Db, feedId: string) {
  await db
    .update(schema.companyFeeds)
    .set({ lastFetchedAt: new Date(), lastSuccessAt: new Date(), consecutiveFailures: 0 })
    .where(eq(schema.companyFeeds.id, feedId))
}

export async function markFeedFailure(db: Db, feedId: string) {
  await db
    .update(schema.companyFeeds)
    .set({
      lastFetchedAt: new Date(),
      consecutiveFailures: sql`${schema.companyFeeds.consecutiveFailures} + 1`,
    })
    .where(eq(schema.companyFeeds.id, feedId))
}
