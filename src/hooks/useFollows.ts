'use client'

import { useCallback, useEffect, useState } from 'react'

export function useFollows() {
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/follows')
      if (res.ok) {
        const { data } = (await res.json()) as { data: { companyId: string }[] }
        setFollowedIds(new Set(data.map((f) => f.companyId)))
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { followedIds, loading, refresh }
}
