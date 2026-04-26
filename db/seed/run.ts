import { config } from 'dotenv'
import { eq } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })
config({ path: '.env' })

import companiesData from './companies.json'
import * as schema from '../schema'

interface FeedData {
  feed_url: string
  feed_type: 'tech' | 'press'
}

interface CompanyData {
  slug: string
  name: string
  domain: string
  logo_url: string | null
  description: string | null
  feeds: FeedData[]
}

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql, { schema })

  const companies = companiesData as CompanyData[]
  let insertedCompanies = 0
  let insertedFeeds = 0

  for (const company of companies) {
    const [upserted] = await db
      .insert(schema.companies)
      .values({
        slug: company.slug,
        name: company.name,
        domain: company.domain,
        logoUrl: company.logo_url ?? null,
        description: company.description ?? null,
      })
      .onConflictDoUpdate({
        target: schema.companies.slug,
        set: {
          name: company.name,
          domain: company.domain,
          logoUrl: company.logo_url ?? null,
          description: company.description ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: schema.companies.id })

    insertedCompanies++

    // 既存フィードを削除して再挿入 (冪等性確保)
    await db.delete(schema.companyFeeds).where(eq(schema.companyFeeds.companyId, upserted.id))

    for (const feed of company.feeds) {
      await db.insert(schema.companyFeeds).values({
        companyId: upserted.id,
        feedUrl: feed.feed_url,
        feedType: feed.feed_type,
      })
      insertedFeeds++
    }
  }

  console.log(`✓ ${insertedCompanies} companies, ${insertedFeeds} feeds seeded.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
