'use client'

import { useEffect } from 'react'

const COOKIE_NAME = 'lastFeedVisit'

export function MarkAsRead() {
  useEffect(() => {
    const expires = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString()
    document.cookie = `${COOKIE_NAME}=${Date.now()}; path=/; expires=${expires}; SameSite=Lax`
  }, [])

  return null
}
