'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const items = [
  { href: '/feed', label: 'フィード' },
  { href: '/popular', label: '人気記事' },
  { href: '/discover', label: '企業を探す' },
  { href: '/bookmarks', label: 'ブックマーク' },
  { href: '/mypage', label: 'マイページ' },
]

export function SidebarNav() {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-sg-accent-soft text-sg-accent-deep font-medium'
                : 'text-sg-ink-soft hover:bg-sg-line-soft'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
