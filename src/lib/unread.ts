import { and, desc, eq, gt, inArray } from 'drizzle-orm'
import { db } from '@/lib/db/server'
import { articles, follows } from '../../db/schema'

export async function getUnreadCount(userId: string, since: Date): Promise<number> {
  const rows = await db
    .select({ companyId: follows.companyId })
    .from(follows)
    .where(eq(follows.userId, userId))

  if (rows.length === 0) return 0

  const companyIds = rows.map((r) => r.companyId)

  const result = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(inArray(articles.companyId, companyIds), gt(articles.publishedAt, since)))
    .orderBy(desc(articles.publishedAt))
    .limit(100)

  return result.length
}
