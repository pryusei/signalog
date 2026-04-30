import { ilike, or, eq } from 'drizzle-orm'
import Link from 'next/link'
import { Suspense } from 'react'

import { CompanyLogo } from '@/components/CompanyLogo'
import { FollowButton } from '@/components/FollowButton'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { companies, follows } from '../../../../db/schema'
import { CompanySearch } from './CompanySearch'

interface PageProps {
  searchParams: Promise<{ q?: string }>
}

export const metadata = {
  title: '企業を探す',
  description: '気になる企業をフォローして、テックブログとプレスリリースをまとめてチェックしよう',
  openGraph: {
    title: '企業を探す | Signalog',
    description: '気になる企業をフォローして、テックブログとプレスリリースをまとめてチェックしよう',
  },
}

export default async function DiscoverPage({ searchParams }: PageProps) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  const session = await auth()
  const userId = session?.user?.id ?? null

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
    <main className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <h1 className="text-sg-ink mb-1 text-xl font-black md:text-2xl">企業を探す</h1>
      <p className="text-sg-ink-soft mb-6 text-sm">
        気になる企業をフォローしてフィードをカスタマイズしよう
      </p>

      <div className="mb-6">
        <Suspense>
          <CompanySearch />
        </Suspense>
      </div>

      {companyList.length === 0 ? (
        <p className="text-sg-ink-soft py-16 text-center">
          {query ? `「${query}」に一致する企業が見つかりません` : '企業がまだ登録されていません'}
        </p>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2">
            {companyList.map((company) => (
              <li
                key={company.id}
                className="border-sg-line bg-sg-surface flex min-w-0 items-center gap-3 rounded-2xl border p-4 transition-shadow hover:shadow-sm"
              >
                <CompanyLogo
                  name={company.name}
                  logoUrl={company.logoUrl}
                  imgClassName="h-11 w-11 shrink-0 rounded-xl object-contain"
                  tileClassName="bg-sg-accent-soft text-sg-accent-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
                />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <Link
                    href={`/companies/${company.slug}`}
                    className="text-sg-ink hover:text-sg-accent-deep block truncate font-semibold"
                  >
                    {company.name}
                  </Link>
                  {company.description && (
                    <p className="text-sg-ink-faint truncate text-xs">{company.description}</p>
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
                    className="bg-sg-accent hover:bg-sg-accent-deep shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold text-white"
                  >
                    ＋ フォロー
                  </a>
                )}
              </li>
            ))}
          </ul>
          <p className="text-sg-ink-faint mt-4 text-right text-xs">{companyList.length} 社</p>
        </>
      )}
    </main>
  )
}
