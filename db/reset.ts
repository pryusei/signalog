import { config } from 'dotenv'
import { neon } from '@neondatabase/serverless'

config({ path: '.env.local' })

async function main() {
  const sql = neon(process.env.DATABASE_URL!)
  await sql`
    DROP TABLE IF EXISTS
      articles,
      follows,
      company_feeds,
      companies,
      verification_tokens,
      sessions,
      accounts,
      users
    CASCADE
  `
  console.log('All tables dropped.')
}

main().catch(console.error)
