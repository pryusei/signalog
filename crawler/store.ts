import { eq, sql } from 'drizzle-orm'
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
    try {
      return [{ item, normalized: normalizeUrl(item.link) }]
    } catch {
      return []
    }
  })

  // OGP 画像を並列取得
  const ogImages = await Promise.all(validItems.map(({ item }) => fetchOgImage(item.link)))

  let newCount = 0
  for (let i = 0; i < validItems.length; i++) {
    const { item, normalized } = validItems[i]
    const result = await db
      .insert(schema.articles)
      .values({
        companyId: feed.companyId,
        feedType: feed.feedType,
        title: sanitizeTitle(item.title),
        sourceUrl: item.link,
        normalizedUrl: normalized,
        ogpImageUrl: ogImages[i],
        publishedAt: new Date(item.pubDate),
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
