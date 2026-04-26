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
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        followed
          ? 'bg-gray-100 text-gray-700 hover:bg-red-50 hover:text-red-600'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {followed ? 'フォロー中' : 'フォロー'}
    </button>
  )
}
