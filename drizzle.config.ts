import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// drizzle-kit は Next.js の env ローダーを持たないため dotenv で明示ロード
config({ path: '.env.local' })
config({ path: '.env' })

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
