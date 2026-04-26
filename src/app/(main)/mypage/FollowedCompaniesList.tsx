'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

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
      <div className="py-16 text-center">
        <p className="mb-4 text-gray-500">フォロー中の企業はまだありません</p>
        <Link
          href="/discover"
          className="rounded-full bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          企業を探す
        </Link>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-3">
      {list.map((company) => (
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
