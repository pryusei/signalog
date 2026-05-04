import { and, eq, inArray, sql } from 'drizzle-orm'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { articles, bookmarks } from '../../../../db/schema'

const toggleSchema = z.object({ articleId: z.string().uuid() })

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
      { status: 401 },
    )
  }

  const body = await request.json().catch(() => null)
  const parsed = toggleSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: '不正なリクエストです' } },
      { status: 400 },
    )
  }

  const { articleId } = parsed.data
  const userId = session.user.id

  const [existing] = await db
    .select({ userId: bookmarks.userId })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)))
    .limit(1)

  if (existing) {
    await db
      .delete(bookmarks)
      .where(and(eq(bookmarks.userId, userId), eq(bookmarks.articleId, articleId)))
    await db
      .update(articles)
      .set({ bookmarkCount: sql`GREATEST(bookmark_count - 1, 0)` })
      .where(eq(articles.id, articleId))
    return Response.json({ bookmarked: false })
  } else {
    await db.insert(bookmarks).values({ userId, articleId })
    await db
      .update(articles)
      .set({ bookmarkCount: sql`bookmark_count + 1` })
      .where(eq(articles.id, articleId))
    return Response.json({ bookmarked: true })
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
      { status: 401 },
    )
  }

  const { searchParams } = request.nextUrl
  const articleIdsParam = searchParams.get('articleIds')
  if (!articleIdsParam) {
    return Response.json({ bookmarkedIds: [] })
  }

  const ids = articleIdsParam
    .split(',')
    .filter((id) => /^[0-9a-f-]{36}$/.test(id))
    .slice(0, 50)

  if (ids.length === 0) {
    return Response.json({ bookmarkedIds: [] })
  }

  const rows = await db
    .select({ articleId: bookmarks.articleId })
    .from(bookmarks)
    .where(and(eq(bookmarks.userId, session.user.id), inArray(bookmarks.articleId, ids)))

  return Response.json({ bookmarkedIds: rows.map((r) => r.articleId) })
}
