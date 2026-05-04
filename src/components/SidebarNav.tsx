'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface Props {
  unreadCount?: number
}

const items = [
  { href: '/feed', label: 'フィード' },
  { href: '/discover', label: '企業を探す' },
  { href: '/mypage', label: 'マイページ' },
]

export function SidebarNav({ unreadCount = 0 }: Props) {
  const pathname = usePathname()
  return (
    <nav className="flex flex-col gap-0.5 px-2">
      {items.map(({ href, label }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        const showBadge = href === '/feed' && unreadCount > 0 && !isActive
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors ${
              isActive
                ? 'bg-sg-accent-soft text-sg-accent-deep font-medium'
                : 'text-sg-ink-soft hover:bg-sg-line-soft'
            }`}
          >
            {label}
            {showBadge && (
              <span className="bg-sg-accent min-w-[20px] rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
