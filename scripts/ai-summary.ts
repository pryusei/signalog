/**
 * AI Summary Worker
 * 未サマリー記事を取得し、Claude Haiku で日本語要約を生成して DB に保存する。
 * GitHub Actions のスケジュール実行を想定。
 */

import Anthropic from '@anthropic-ai/sdk'
import { and, asc, gt, isNull } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { eq } from 'drizzle-orm'

import * as schema from '../db/schema'

const BATCH_SIZE = 20
const MAX_TITLE_CHARS = 200
// 7日以内の記事のみ対象
const RECENCY_DAYS = 7

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('[ai-summary] fatal: DATABASE_URL is not set.')
    process.exit(1)
  }
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  if (!anthropicKey) {
    console.error('[ai-summary] fatal: ANTHROPIC_API_KEY is not set.')
    process.exit(1)
  }

  const sql = neon(databaseUrl)
  const db = drizzle(sql, { schema })
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const since = new Date(Date.now() - RECENCY_DAYS * 24 * 60 * 60 * 1000)

  const rows = await db
    .select({
      id: schema.articles.id,
      title: schema.articles.title,
      feedType: schema.articles.feedType,
    })
    .from(schema.articles)
    .where(and(isNull(schema.articles.aiSummary), gt(schema.articles.publishedAt, since)))
    .orderBy(asc(schema.articles.publishedAt))
    .limit(BATCH_SIZE)

  if (rows.length === 0) {
    console.log('[ai-summary] no articles to summarize.')
    return
  }

  console.log(`[ai-summary] summarizing ${rows.length} articles...`)

  let success = 0
  let failure = 0

  for (const row of rows) {
    const title = row.title.slice(0, MAX_TITLE_CHARS)
    const typeLabel = row.feedType === 'tech' ? 'テックブログ記事' : 'プレスリリース'

    try {
      const message = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 150,
        messages: [
          {
            role: 'user',
            content: `以下の${typeLabel}のタイトルから、記事の内容を日本語で2〜3文で簡潔に要約してください。タイトルのみから推測してOKです。要約のみを出力してください。\n\nタイトル: ${title}`,
          },
        ],
      })

      const summary = message.content[0].type === 'text' ? message.content[0].text.trim() : null

      if (summary) {
        await db
          .update(schema.articles)
          .set({ aiSummary: summary, aiSummaryGeneratedAt: new Date() })
          .where(eq(schema.articles.id, row.id))
        success++
        console.log(`[ai-summary] ✓ ${row.id.slice(0, 8)} — ${title.slice(0, 40)}`)
      }
    } catch (err) {
      failure++
      console.error(`[ai-summary] ✗ ${row.id.slice(0, 8)}:`, err)
    }
  }

  console.log(`[ai-summary] done. success=${success} failure=${failure}`)
}

main().catch((err) => {
  console.error('[ai-summary] unexpected error:', err)
  process.exit(1)
})
