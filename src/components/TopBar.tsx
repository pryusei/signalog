import Link from 'next/link'
import type { Session } from 'next-auth'

import { signOut } from '@/lib/auth'

interface Props {
  session: Session | null
}

export function TopBar({ session }: Props) {
  return (
    <header className="border-sg-line-soft bg-sg-surface flex h-14 shrink-0 items-center border-b px-6">
      <Link href="/feed" className="text-sg-ink text-xl font-black tracking-tight">
        Signalog
      </Link>
      <div className="flex-1" />
      {session?.user ? (
        <form
          action={async () => {
            'use server'
            await signOut({ redirectTo: '/feed' })
          }}
        >
          <button
            type="submit"
            className="text-sg-ink-soft hover:bg-sg-line-soft rounded-full px-4 py-1.5 text-sm transition-colors"
          >
            ログアウト
          </button>
        </form>
      ) : (
        <Link
          href="/login"
          className="bg-sg-accent hover:bg-sg-accent-deep rounded-full px-4 py-1.5 text-sm font-semibold text-white transition-colors"
        >
          ログイン
        </Link>
      )}
    </header>
  )
}
