'use client'

import { useState } from 'react'

interface FollowButtonProps {
  companyId: string
  initialFollowed: boolean
  onUnfollow?: () => void
}

export function FollowButton({ companyId, initialFollowed, onUnfollow }: FollowButtonProps) {
  const [followed, setFollowed] = useState(initialFollowed)
  const [pending, setPending] = useState(false)

  async function toggle() {
    if (pending) return
    setPending(true)
    setFollowed((prev) => !prev)

    try {
      const res = await fetch('/api/follows', {
        method: followed ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyId }),
      })
      if (!res.ok) {
        setFollowed((prev) => !prev)
      } else if (followed) {
        onUnfollow?.()
      }
    } catch {
      setFollowed((prev) => !prev)
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        followed
          ? 'border-sg-line bg-sg-surface text-sg-ink-soft border hover:border-red-200 hover:bg-red-50 hover:text-red-600'
          : 'bg-sg-accent hover:bg-sg-accent-deep text-white'
      }`}
    >
      {followed ? 'フォロー中 ✓' : '＋ フォロー'}
    </button>
  )
}
