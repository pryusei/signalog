import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from '../db/schema'

const db = drizzle(neon(process.env.DATABASE_URL!), { schema })

async function main() {
  const result = await db
    .update(schema.articles)
    .set({ aiSummary: null, aiSummaryGeneratedAt: null })

  console.log('AI要約をリセットしました')
}

main().catch(console.error)
