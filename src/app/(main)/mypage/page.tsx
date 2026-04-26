import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { FollowButton } from '@/components/FollowButton'
import { companies, follows } from '../../../../db/schema'

export const metadata = { title: 'マイページ | Signalog' }

export default async function MyPage() {
  const session = await auth()
  if (!session) redirect('/login')

  const followedCompanies = await db
    .select({
      id: companies.id,
      slug: companies.slug,
      name: companies.name,
      logoUrl: companies.logoUrl,
      description: companies.description,
      followedAt: follows.createdAt,
    })
    .from(follows)
    .innerJoin(companies, eq(follows.companyId, companies.id))
    .where(eq(follows.userId, session.user.id))
    .orderBy(follows.createdAt)

  const user = session.user

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* プロフィール */}
      <section className="mb-8 flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name ?? 'アバター'}
            width={64}
            height={64}
            className="h-16 w-16 rounded-full"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-500">
            {user.name?.[0] ?? '?'}
          </div>
        )}
        <div>
          <p className="text-lg font-semibold text-gray-900">{user.name ?? '名前未設定'}</p>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </section>

      {/* フォロー中企業 */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          フォロー中の企業
          <span className="ml-2 text-sm font-normal text-gray-400">
            {followedCompanies.length} 社
          </span>
        </h2>

        {followedCompanies.length === 0 ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-gray-500">フォロー中の企業はまだありません</p>
            <Link
              href="/discover"
              className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              企業を探す
            </Link>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {followedCompanies.map((company) => (
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
                  <p className="text-xs text-gray-400">
                    フォロー:{' '}
                    {company.followedAt.toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
                <FollowButton companyId={company.id} initialFollowed={true} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
