---
name: rss-crawler
description: Signalog の RSS クローラー実装ガイド。SGL-006 で GitHub Actions 上の RSS クローラーを実装する際に必ず参照すること。URL正規化ルール、並列実行制御、重複検知、エラーハンドリング、HTML サニタイズ、OGP 画像取得のすべてのパターンを含む。RSS フィードを扱うコードを書く際は必ず読むこと。
---

# RSS クローラー実装ガイド

## アーキテクチャ

```
GitHub Actions (cron: 0 */3 * * *)
  ↓
crawler/index.ts (エントリ)
  ↓
1. company_feeds から全 RSS URL を取得
2. p-limit で並列度10、タイムアウト10秒で並列実行
3. 各 RSS について:
   - fetch.ts でパース
   - normalize.ts で URL 正規化
   - sanitize.ts で HTML サニタイズ
   - og-image.ts で OGP 画像取得
   - store.ts で UPSERT (重複は無視)
4. ログ出力
```

## URL 正規化ルール (重要)

`crawler/normalize.ts` に実装。

```typescript
const TRACKING_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'fbclid',
  'gclid',
  'ref',
  'source',
]

export function normalizeUrl(input: string): string {
  const url = new URL(input)

  // 1. https に統一
  if (url.protocol === 'http:') url.protocol = 'https:'

  // 2. フラグメント除去
  url.hash = ''

  // 3. トラッキングパラメータ除去
  for (const param of TRACKING_PARAMS) {
    url.searchParams.delete(param)
  }

  // 4. 末尾スラッシュ除去 (パスのみ)
  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.slice(0, -1)
  }

  return url.toString()
}
```

**注意**: `url.searchParams` のソート順は保証されないため、検索パラメータが変わると別 URL 扱いになる可能性がある。Phase 1 では問題視しない。

## 並列実行制御

```typescript
// crawler/index.ts
import pLimit from 'p-limit'

const limit = pLimit(10) // 並列度10

const results = await Promise.allSettled(
  feeds.map((feed) =>
    limit(
      () => withTimeout(processFeed(feed), 10_000), // 10秒タイムアウト
    ),
  ),
)

// 集計
const succeeded = results.filter((r) => r.status === 'fulfilled').length
const failed = results.filter((r) => r.status === 'rejected').length
console.log({ total: feeds.length, succeeded, failed })
```

## RSS パース

`rss-parser` を使う。

```typescript
import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'SignalogBot/1.0 (+https://signalog.app/bot)',
  },
})

const feed = await parser.parseURL(feedUrl)
for (const item of feed.items) {
  // item.title, item.link, item.pubDate, item.content, item['content:encoded']
}
```

**注意**: `item.guid` は信頼できないフィードがあるため、識別子としては使わず、必ず `normalizeUrl(item.link)` を使う。

## HTML サニタイズ

DOMPurify は基本的にブラウザ用だが、`isomorphic-dompurify` で Node でも使える。

```typescript
import DOMPurify from 'isomorphic-dompurify'

const cleanText = DOMPurify.sanitize(item.content || '', {
  ALLOWED_TAGS: [], // テキストのみ抽出
  ALLOWED_ATTR: [],
})
```

ただし Phase 1 では本文は保存しないので、サニタイズが必要なのはタイトルのみ(基本的に問題ない)。

## OGP 画像取得

記事URLから `<meta property="og:image">` を取得。

```typescript
async function fetchOgImage(articleUrl: string): Promise<string | null> {
  try {
    const res = await fetch(articleUrl, {
      signal: AbortSignal.timeout(5_000),
      headers: { 'User-Agent': 'SignalogBot/1.0' },
    })
    if (!res.ok) return null

    const html = await res.text()
    const match = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i)
    return match?.[1] ?? null
  } catch {
    return null // 失敗しても記事自体は保存する
  }
}
```

**負荷対策**: OGP 取得は失敗しても記事保存は続ける。タイムアウト5秒。

## DB 保存 (UPSERT)

```typescript
// crawler/store.ts
import { db } from '@/lib/db/server'
import { articles } from '@/lib/db/schema'

await db
  .insert(articles)
  .values({
    companyId,
    feedType, // 'tech' | 'press'
    title: cleanTitle,
    sourceUrl: item.link!,
    normalizedUrl: normalizeUrl(item.link!),
    ogpImageUrl: ogImage,
    publishedAt: new Date(item.pubDate!),
  })
  .onConflictDoNothing({
    target: [articles.companyId, articles.normalizedUrl],
  })
```

## エラーハンドリング

各企業の処理は独立。1社失敗しても他に影響しない。

```typescript
async function processFeed(feed: CompanyFeed) {
  try {
    const items = await fetchRss(feed.feedUrl)
    for (const item of items) {
      try {
        await storeArticle(feed, item)
      } catch (e) {
        // 1記事の失敗はスキップ、企業全体には影響させない
        console.error('article failed', { feedUrl: feed.feedUrl, item: item.link, error: e })
      }
    }
    // 成功時に last_success_at を更新
    await db
      .update(companyFeeds)
      .set({ lastFetchedAt: new Date(), lastSuccessAt: new Date(), consecutiveFailures: 0 })
      .where(eq(companyFeeds.id, feed.id))
  } catch (e) {
    // フィード全体の失敗は記録
    await db
      .update(companyFeeds)
      .set({
        lastFetchedAt: new Date(),
        consecutiveFailures: sql`${companyFeeds.consecutiveFailures} + 1`,
      })
      .where(eq(companyFeeds.id, feed.id))
    throw e
  }
}
```

## GitHub Actions ワークフロー

```yaml
# .github/workflows/crawl.yml
name: Crawl RSS Feeds

on:
  schedule:
    - cron: '0 */3 * * *' # 3時間ごと
  workflow_dispatch: # 手動実行可能

concurrency:
  group: crawl
  cancel-in-progress: false # クロール途中でキャンセルしない

jobs:
  crawl:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm crawl
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## 禁止事項

- スクレイピング(RSS/Atom 以外の方法での記事取得)
- 記事本文の DB 保存(著作権リスク + Phase 1 スコープ外)
- フィード取得を直列実行(全社処理に時間がかかりすぎる)
- 同期的な無限リトライ(GitHub Actions 時間枯渇)
