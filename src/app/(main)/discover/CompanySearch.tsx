'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'

export function CompanySearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value.trim()
      const params = new URLSearchParams(searchParams.toString())
      if (q) {
        params.set('q', q)
      } else {
        params.delete('q')
      }
      startTransition(() => {
        router.push(`/discover?${params.toString()}`)
      })
    },
    [router, searchParams],
  )

  return (
    <div className="relative">
      <input
        type="search"
        defaultValue={searchParams.get('q') ?? ''}
        onChange={handleChange}
        placeholder="企業名で検索..."
        className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
      <svg
        className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-400"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      {isPending && (
        <div className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      )}
    </div>
  )
}
