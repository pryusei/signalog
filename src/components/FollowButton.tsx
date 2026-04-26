'use client'

import { useState } from 'react'

interface FollowButtonProps {
  companyId: string
  initialFollowed: boolean
}

export function FollowButton({ companyId, initialFollowed }: FollowButtonProps) {
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
      if (!res.ok) setFollowed((prev) => !prev)
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
          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      }`}
    >
      {followed ? 'フォロー中' : 'フォロー'}
    </button>
  )
}
