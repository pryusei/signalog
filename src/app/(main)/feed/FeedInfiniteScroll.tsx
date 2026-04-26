'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { ArticleCard } from '@/components/ArticleCard'
import type { ArticleWithCompany } from '@/app/api/feed/route'

interface Props {
  initialArticles: ArticleWithCompany[]
  initialNextCursor: string | null
  type: string
  following: boolean
}

export function FeedInfiniteScroll({ initialArticles, initialNextCursor, type, following }: Props) {
  const [articles, setArticles] = useState(initialArticles)
  const [nextCursor, setNextCursor] = useState(initialNextCursor)
  const [loading, setLoading] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading) return
    setLoading(true)
    try {
      const params = new URLSearchParams({ cursor: nextCursor, limit: '20' })
      if (type !== 'all') params.set('type', type)
      if (following) params.set('following', 'true')

      const res = await fetch(`/api/feed?${params}`)
      if (!res.ok) return
      const json = (await res.json()) as { data: ArticleWithCompany[]; nextCursor: string | null }
      setArticles((prev) => [...prev, ...json.data])
      setNextCursor(json.nextCursor)
    } finally {
      setLoading(false)
    }
  }, [nextCursor, loading, type, following])

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { rootMargin: '200px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  return (
    <>
      <ul className="flex flex-col gap-3">
        {articles.map((article) => (
          <li key={article.id}>
            <ArticleCard article={article} />
          </li>
        ))}
      </ul>

      <div ref={sentinelRef} className="py-4 text-center">
        {loading && <span className="text-sm text-gray-400">読み込み中...</span>}
        {!loading && !nextCursor && articles.length > 0 && (
          <span className="text-sm text-gray-400">すべての記事を表示しました</span>
        )}
      </div>
    </>
  )
}
