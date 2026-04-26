import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ---------------------------------------------------------------------------
// NextAuth.js テーブル
// @auth/drizzle-adapter が要求する型に合わせた定義
// ---------------------------------------------------------------------------

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified', { withTimezone: true }),
  image: text('image'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// accounts: OAuth token カラムは snake_case プロパティ名、複合 PK (provider, providerAccountId)
export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
  }),
)

// sessions: sessionToken を PK とする (アダプター要件)
export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
})

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.identifier, table.token] }),
  }),
)

// ---------------------------------------------------------------------------
// 企業 / フィード
// ---------------------------------------------------------------------------

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

export const companyFeeds = pgTable('company_feeds', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  feedUrl: text('feed_url').notNull(),
  feedType: text('feed_type', { enum: ['tech', 'press'] }).notNull(),
  lastFetchedAt: timestamp('last_fetched_at', { withTimezone: true }),
  lastSuccessAt: timestamp('last_success_at', { withTimezone: true }),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
})

// ---------------------------------------------------------------------------
// フォロー
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 記事
// ---------------------------------------------------------------------------

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
    aiSummaryGeneratedAt: timestamp('ai_summary_generated_at', { withTimezone: true }), // Phase 2 用に予約
  },
  (table) => ({
    companyUrlIdx: uniqueIndex('articles_company_url_idx').on(table.companyId, table.normalizedUrl),
    pubIdIdx: index('articles_pub_id_idx').on(table.publishedAt, table.id),
  }),
)

// ---------------------------------------------------------------------------
// Relations
// ---------------------------------------------------------------------------

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  follows: many(follows),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}))

export const companiesRelations = relations(companies, ({ many }) => ({
  feeds: many(companyFeeds),
  follows: many(follows),
  articles: many(articles),
}))

export const companyFeedsRelations = relations(companyFeeds, ({ one }) => ({
  company: one(companies, { fields: [companyFeeds.companyId], references: [companies.id] }),
}))

export const followsRelations = relations(follows, ({ one }) => ({
  user: one(users, { fields: [follows.userId], references: [users.id] }),
  company: one(companies, { fields: [follows.companyId], references: [companies.id] }),
}))

export const articlesRelations = relations(articles, ({ one }) => ({
  company: one(companies, { fields: [articles.companyId], references: [companies.id] }),
}))
