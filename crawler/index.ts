import { config } from 'dotenv'
import pLimit from 'p-limit'
import type { InferSelectModel } from 'drizzle-orm'

config({ path: '.env.local' })
config({ path: '.env' })

import * as schema from '../db/schema'

type CompanyFeed = InferSelectModel<typeof schema.companyFeeds>
import { createDb, markFeedFailure, markFeedSuccess, storeArticles } from './store'
import { fetchRssFeed } from './fetch'

const CONCURRENCY = 10
const FEED_TIMEOUT_MS = 10_000

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([promise, timeout])
  } finally {
    clearTimeout(timer!)
  }
}

async function processFeed(db: ReturnType<typeof createDb>, feed: CompanyFeed): Promise<number> {
  try {
    const items = await withTimeout(fetchRssFeed(feed.feedUrl), FEED_TIMEOUT_MS)
    const newCount = await storeArticles(db, feed, items)
    await markFeedSuccess(db, feed.id)
    return newCount
  } catch (err) {
    await markFeedFailure(db, feed.id)
    throw err
  }
}

async function main() {
  const start = Date.now()
  const db = createDb()

  const feeds = await db.select().from(schema.companyFeeds)
  console.log(`[crawl] ${feeds.length} feeds to process`)

  const limit = pLimit(CONCURRENCY)
  let totalNew = 0
  let succeeded = 0
  let failed = 0

  const results = await Promise.allSettled(
    feeds.map((feed) =>
      limit(async () => {
        const newCount = await processFeed(db, feed)
        return newCount
      }),
    ),
  )

  for (const result of results) {
    if (result.status === 'fulfilled') {
      succeeded++
      totalNew += result.value
    } else {
      failed++
      console.error('[crawl] feed failed:', result.reason)
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1)
  console.log(
    `[crawl] done in ${elapsed}s — ${succeeded} succeeded, ${failed} failed, ${totalNew} new articles`,
  )
}

main().catch((err) => {
  console.error('[crawl] fatal:', err)
  process.exit(1)
})
