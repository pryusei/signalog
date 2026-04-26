import Image from 'next/image'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'

import { auth } from '@/lib/auth'
import { db } from '@/lib/db/server'
import { companies, follows } from '../../../../db/schema'
import { FollowedCompaniesList } from './FollowedCompaniesList'

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

      <section>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          フォロー中の企業
          <span className="ml-2 text-sm font-normal text-gray-400">
            {followedCompanies.length} 社
          </span>
        </h2>
        <FollowedCompaniesList initialList={followedCompanies} />
      </section>
    </main>
  )
}
