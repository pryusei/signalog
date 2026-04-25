import { loadEnvConfig } from '@next/env'
import { defineConfig } from 'drizzle-kit'

// Next.js と同じ順序で .env.local などを読み込む
loadEnvConfig(process.cwd())

export default defineConfig({
  schema: './db/schema.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
