import { and, eq } from 'drizzle-orm'
import { type NextRequest } from 'next/server'
import { z } from 'zod'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { companies, follows } from '../../../../db/schema'

const bodySchema = z.object({ companyId: z.string().uuid() })

async function parseBody(request: NextRequest): Promise<unknown> {
  try {
    return await request.json()
  } catch {
    return null
  }
}

export async function GET() {
  const session = await auth()
  if (!session) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
      { status: 401 },
    )
  }

  const rows = await db
    .select({ companyId: follows.companyId })
    .from(follows)
    .where(eq(follows.userId, session.user.id))

  return Response.json({ data: rows })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
      { status: 401 },
    )
  }

  const parsed = bodySchema.safeParse(await parseBody(request))
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: '無効なリクエスト' } },
      { status: 400 },
    )
  }

  const { companyId } = parsed.data

  const [company] = await db
    .select({ id: companies.id })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)

  if (!company) {
    return Response.json(
      { error: { code: 'NOT_FOUND', message: '企業が見つかりません' } },
      { status: 404 },
    )
  }

  await db.insert(follows).values({ userId: session.user.id, companyId }).onConflictDoNothing()

  return Response.json({ data: { companyId } })
}

export async function DELETE(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
      { status: 401 },
    )
  }

  const parsed = bodySchema.safeParse(await parseBody(request))
  if (!parsed.success) {
    return Response.json(
      { error: { code: 'BAD_REQUEST', message: '無効なリクエスト' } },
      { status: 400 },
    )
  }

  const { companyId } = parsed.data

  await db
    .delete(follows)
    .where(and(eq(follows.userId, session.user.id), eq(follows.companyId, companyId)))

  return Response.json({ data: null })
}
