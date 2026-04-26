import { auth } from '@/lib/auth'
import { Sidebar } from '@/components/Sidebar'
import { TopBar } from '@/components/TopBar'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  return (
    <div className="flex h-screen flex-col">
      <TopBar session={session} />
      <div className="flex min-h-0 flex-1">
        <Sidebar session={session} />
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  )
}
