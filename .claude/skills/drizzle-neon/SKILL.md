---
name: drizzle-neon
description: Drizzle ORM と Neon (Serverless PostgreSQL) の使い方。Signalog で DB スキーマ定義、クエリ作成、マイグレーション、シード作成を行う際は必ず参照すること。Drizzle の型安全なクエリビルダの書き方、Neon Serverless ドライバの設定、トランザクション、UPSERT、認可付きクエリのパターンを含む。
---

# Drizzle ORM + Neon

## セットアップ

### パッケージ

```bash
pnpm add drizzle-orm @neondatabase/serverless
pnpm add -D drizzle-kit
```

### drizzle.config.ts

```typescript
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
```

### DB クライアント (Server 用)

```typescript
// src/lib/db/server.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

## スキーマ定義

### 基本パターン

```typescript
// db/schema.ts
import { pgTable, uuid, text, timestamp, primaryKey, uniqueIndex, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const companies = pgTable('companies', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  domain: text('domain').notNull(),
  logoUrl: text('logo_url'),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    feedType: text('feed_type', { enum: ['tech', 'press'] }).notNull(),
    title: text('title').notNull(),
    sourceUrl: text('source_url').notNull(),
    normalizedUrl: text('normalized_url').notNull(),
    ogpImageUrl: text('ogp_image_url'),
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
    aiSummary: text('ai_summary'), // Phase 2 用に予約
    aiSummaryGeneratedAt: timestamp('ai_summary_generated_at', { withTimezone: true }),
  },
  (table) => ({
    companyUrlIdx: uniqueIndex('articles_company_url_idx').on(table.companyId, table.normalizedUrl),
    pubIdIdx: index('articles_pub_id_idx').on(table.publishedAt, table.id),
  }),
)

export const follows = pgTable(
  'follows',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    companyId: uuid('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.companyId] }),
  }),
)
```

### relations 定義 (JOIN 用)

```typescript
export const articlesRelations = relations(articles, ({ one }) => ({
  company: one(companies, {
    fields: [articles.companyId],
    references: [companies.id],
  }),
}))

export const followsRelations = relations(follows, ({ one }) => ({
  user: one(users, { fields: [follows.userId], references: [users.id] }),
  company: one(companies, { fields: [follows.companyId], references: [companies.id] }),
}))
```

## クエリパターン

### SELECT (基本)

```typescript
import { db } from '@/lib/db/server'
import { articles, companies } from '@/lib/db/schema'
import { desc, eq } from 'drizzle-orm'

// シンプルな SELECT
const result = await db.select().from(articles).orderBy(desc(articles.publishedAt)).limit(20)

// JOIN
const result = await db
  .select({
    article: articles,
    company: companies,
  })
  .from(articles)
  .innerJoin(companies, eq(articles.companyId, companies.id))
  .orderBy(desc(articles.publishedAt))
  .limit(20)
```

### relational queries (推奨)

```typescript
// より読みやすい
const result = await db.query.articles.findMany({
  with: { company: true },
  orderBy: (articles, { desc }) => [desc(articles.publishedAt)],
  limit: 20,
})
```

### 認可付きクエリ (重要)

ユーザー固有のデータは必ず `where` 句で絞り込む。

```typescript
// ✅ 正しい: 自分のフォローのみ取得
const myFollows = await db.select().from(follows).where(eq(follows.userId, session.user.id))

// ❌ 間違い: 全ユーザーのフォローを取得してしまう
const allFollows = await db.select().from(follows)
```

### カーソルページネーション

```typescript
import { and, lt, or, eq, desc } from 'drizzle-orm'

interface Cursor {
  publishedAt: string // ISO8601
  id: string
}

async function getArticles(cursor: Cursor | null, limit = 20) {
  const query = db
    .select()
    .from(articles)
    .orderBy(desc(articles.publishedAt), desc(articles.id))
    .limit(limit)

  if (cursor) {
    query.where(
      or(
        lt(articles.publishedAt, new Date(cursor.publishedAt)),
        and(eq(articles.publishedAt, new Date(cursor.publishedAt)), lt(articles.id, cursor.id)),
      ),
    )
  }

  return query
}
```

### UPSERT (重複検知)

クローラーで使う。重複は無視。

```typescript
await db
  .insert(articles)
  .values({
    companyId,
    feedType: 'tech',
    title,
    sourceUrl,
    normalizedUrl,
    publishedAt,
  })
  .onConflictDoNothing({
    target: [articles.companyId, articles.normalizedUrl],
  })
```

### トランザクション

```typescript
await db.transaction(async (tx) => {
  await tx.insert(follows).values({ userId, companyId })
  // 他の操作...
})
```

## マイグレーション

```bash
# スキーマからマイグレーションファイル生成
pnpm drizzle-kit generate

# マイグレーション適用
pnpm drizzle-kit migrate

# スキーマ直接同期 (開発時のみ、本番では使わない)
pnpm drizzle-kit push
```

## Neon の制約

- **Free プランのコネクション数制限**: serverless ドライバ (`@neondatabase/serverless`) を使うこと。通常の `pg` パッケージは接続枯渇しやすい
- **マイグレーション用と通常クエリで接続を分けたい場合**: `DATABASE_URL_UNPOOLED` を使う(Neon ダッシュボードから取得)
- **Cold Start**: Free プランは数秒のコールドスタートあり。本番運用時は Pro プラン検討

## 禁止事項

- 生 SQL (`sql\`SELECT \* FROM articles WHERE id = ${id}\``) をユーザー入力と組み合わせない (SQL Injection)
- `db.execute(sql\`...\`)`を使う場合は必ず`sql.placeholder()` でバインディング
- 認可なしのクエリでユーザー固有データを取得しない
