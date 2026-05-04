'use client'

import { useState, useTransition } from 'react'

interface Props {
  articleId: string
  initialIsBookmarked: boolean
  initialCount: number
}

export function BookmarkButton({ articleId, initialIsBookmarked, initialCount }: Props) {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()

  function handleClick(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    // 楽観的更新
    const next = !isBookmarked
    setIsBookmarked(next)
    setCount((c) => (next ? c + 1 : Math.max(0, c - 1)))

    startTransition(async () => {
      try {
        const res = await fetch('/api/bookmarks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ articleId }),
        })
        if (!res.ok) {
          // ロールバック
          setIsBookmarked(!next)
          setCount((c) => (!next ? c + 1 : Math.max(0, c - 1)))
        }
      } catch {
        setIsBookmarked(!next)
        setCount((c) => (!next ? c + 1 : Math.max(0, c - 1)))
      }
    })
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={isBookmarked ? 'ブックマーク解除' : 'ブックマーク'}
      className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs transition-colors ${
        isBookmarked
          ? 'text-sg-accent bg-sg-accent-soft'
          : 'text-sg-ink-faint hover:text-sg-accent hover:bg-sg-accent-soft'
      }`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill={isBookmarked ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
      {count > 0 && <span>{count}</span>}
    </button>
  )
}
