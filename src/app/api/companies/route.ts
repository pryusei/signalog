import { ilike, or } from 'drizzle-orm'
import { type NextRequest } from 'next/server'

import { db } from '@/lib/db/server'
import { escapeLike } from '@/lib/escapeLike'
import { companies } from '../../../../db/schema'

export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get('q')?.trim() ?? '').slice(0, 100)

  const rows = await db
    .select()
    .from(companies)
    .where(
      q
        ? or(
            ilike(companies.name, `%${escapeLike(q)}%`),
            ilike(companies.slug, `%${escapeLike(q)}%`),
          )
        : undefined,
    )
    .orderBy(companies.name)
    .limit(100)

  return Response.json({ data: rows })
}
