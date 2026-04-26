'use client'

import Link from 'next/link'
import { useState } from 'react'

import { CompanyLogo } from '@/components/CompanyLogo'
import { FollowButton } from '@/components/FollowButton'

interface FollowedCompany {
  id: string
  slug: string
  name: string
  logoUrl: string | null
  description: string | null
  followedAt: Date
}

export function FollowedCompaniesList({ initialList }: { initialList: FollowedCompany[] }) {
  const [list, setList] = useState(initialList)

  if (list.length === 0) {
    return (
      <div className="border-sg-line bg-sg-surface rounded-2xl border py-16 text-center">
        <p className="text-sg-ink-soft mb-4">フォロー中の企業はまだありません</p>
        <Link
          href="/discover"
          className="bg-sg-accent hover:bg-sg-accent-deep rounded-full px-6 py-2 text-sm font-semibold text-white"
        >
          企業を探す →
        </Link>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {list.map((company) => (
        <li
          key={company.id}
          className="border-sg-line bg-sg-surface flex items-center gap-3 rounded-2xl border p-4"
        >
          <CompanyLogo
            name={company.name}
            logoUrl={company.logoUrl}
            imgClassName="h-11 w-11 shrink-0 rounded-xl object-contain"
            tileClassName="bg-sg-accent-soft text-sg-accent-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold"
          />
          <div className="min-w-0 flex-1">
            <Link
              href={`/companies/${company.slug}`}
              className="text-sg-ink hover:text-sg-accent-deep font-semibold"
            >
              {company.name}
            </Link>
            {company.description && (
              <p className="text-sg-ink-soft truncate text-xs">{company.description}</p>
            )}
            <p className="text-sg-ink-faint text-[11px]">
              {company.followedAt.toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}{' '}
              にフォロー
            </p>
          </div>
          <FollowButton
            companyId={company.id}
            initialFollowed={true}
            onUnfollow={() => setList((prev) => prev.filter((c) => c.id !== company.id))}
          />
        </li>
      ))}
    </ul>
  )
}
