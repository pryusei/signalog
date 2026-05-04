import type { Session } from 'next-auth'

import { SidebarNav } from './SidebarNav'

interface Props {
  session: Session | null
  unreadCount?: number
}

export function Sidebar({ session, unreadCount = 0 }: Props) {
  const user = session?.user
  return (
    <aside className="border-sg-line-soft bg-sg-surface hidden w-[200px] shrink-0 flex-col border-r md:flex">
      <div className="text-sg-ink-faint px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wider uppercase">
        メニュー
      </div>
      <SidebarNav unreadCount={unreadCount} />
      <div className="flex-1" />
      {user && (
        <div className="border-sg-line-soft border-t px-4 py-3">
          <div className="text-sg-ink-faint mb-2 text-[11px] font-semibold tracking-wider uppercase">
            アカウント
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-sg-accent flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white">
              {(user.name ?? user.email ?? '?')[0].toUpperCase()}
            </div>
            <span className="text-sg-ink-soft truncate text-xs">{user.name ?? user.email}</span>
          </div>
        </div>
      )}
    </aside>
  )
}
