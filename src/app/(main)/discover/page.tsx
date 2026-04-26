import { ilike, or } from 'drizzle-orm'
import { eq } from 'drizzle-orm'
import Image from 'next/image'
import { Suspense } from 'react'

import { FollowButton } from '@/components/FollowButton'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { companies, follows } from '../../../../db/schema'
import { CompanySearch } from './CompanySearch'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export const metadata = { title: '企業を探す | Signalog' }

export default async function DiscoverPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const session = await auth()
  const userId = session?.user.id ?? null

  const [companyList, followedRows] = await Promise.all([
    db
      .select()
      .from(companies)
      .where(
        query
          ? or(ilike(companies.name, `%${query}%`), ilike(companies.slug, `%${query}%`))
          : undefined,
      )
      .orderBy(companies.name)
      .limit(100),
    userId
      ? db.select({ companyId: follows.companyId }).from(follows).where(eq(follows.userId, userId))
      : Promise.resolve([]),
  ])

  const followedSet = new Set(followedRows.map((f) => f.companyId))

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900">企業を探す</h1>
        <p className="text-gray-500">気になる企業をフォローしてフィードをカスタマイズしよう</p>
      </div>

      <div className="mb-6">
        <Suspense>
          <CompanySearch />
        </Suspense>
      </div>

      {companyList.length === 0 ? (
        <p className="py-16 text-center text-gray-500">
          {query ? `「${query}」に一致する企業が見つかりません` : '企業がまだ登録されていません'}
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {companyList.map((company) => (
            <li
              key={company.id}
              className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              {company.logoUrl ? (
                <Image
                  src={company.logoUrl}
                  alt={company.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-sm font-bold text-gray-400">
                  {company.name[0]}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-gray-900">{company.name}</p>
                {company.description && (
                  <p className="truncate text-sm text-gray-500">{company.description}</p>
                )}
              </div>
              {userId ? (
                <FollowButton
                  companyId={company.id}
                  initialFollowed={followedSet.has(company.id)}
                />
              ) : (
                <a
                  href="/login"
                  className="rounded-full bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  フォロー
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-right text-xs text-gray-400">{companyList.length} 社</p>
    </main>
  )
}
