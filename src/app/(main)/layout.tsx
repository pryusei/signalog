import { cookies } from 'next/headers'

import { auth } from '@/lib/auth'
import { getUnreadCount } from '@/lib/unread'
import { BottomNav } from '@/components/BottomNav'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // eslint-disable-next-line react-hooks/purity -- Server Component では Date.now() は安全
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  let unreadCount = 0
  if (session?.user?.id) {
    const jar = await cookies()
    const lastVisitRaw = jar.get('lastFeedVisit')?.value
    const since = lastVisitRaw ? new Date(Number(lastVisitRaw)) : sevenDaysAgo
    unreadCount = await getUnreadCount(session.user.id, since)
  }

  return (
    <div className="flex h-screen flex-col">
      <TopBar session={session} />
      <div className="flex min-h-0 flex-1">
        <Sidebar session={session} unreadCount={unreadCount} />
        <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>
      </div>
      <BottomNav unreadCount={unreadCount} />
    </div>
  )
}
