import Link from 'next/link'
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
  const initial = (user.name ?? user.email ?? '?')[0].toUpperCase()

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      {/* Profile card */}
      <section className="border-sg-line bg-sg-surface mb-6 flex items-center gap-4 rounded-2xl border p-6">
        <div className="bg-sg-accent flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-black text-white">
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sg-ink text-lg font-bold">{user.name ?? '名前未設定'}</p>
          <p className="text-sg-ink-soft text-sm">{user.email}</p>
          <div className="mt-2 flex gap-2">
            <span className="bg-sg-accent-soft text-sg-accent-deep rounded-full px-2.5 py-0.5 text-xs font-semibold">
              フォロー {followedCompanies.length} 社
            </span>
          </div>
        </div>
      </section>

      {/* Followed companies */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sg-ink font-bold">
            フォロー中の企業
            <span className="text-sg-ink-faint ml-2 text-sm font-normal">
              {followedCompanies.length} 社
            </span>
          </h2>
          <Link
            href="/discover"
            className="bg-sg-accent hover:bg-sg-accent-deep rounded-full px-3 py-1.5 text-xs font-semibold text-white"
          >
            ＋ 企業を追加
          </Link>
        </div>
        <FollowedCompaniesList initialList={followedCompanies} />
      </section>
    </main>
  )
}
