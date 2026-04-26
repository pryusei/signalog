import Link from 'next/link'

import { auth, signOut } from '@/lib/auth'

export async function Header() {
  const session = await auth()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/feed" className="text-xl font-black tracking-tight text-gray-900">
          Signalog
        </Link>

        <nav className="flex items-center gap-1">
          <Link
            href="/feed"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            フィード
          </Link>
          <Link
            href="/discover"
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
          >
            企業を探す
          </Link>

          {session?.user ? (
            <>
              <Link
                href="/mypage"
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              >
                マイページ
              </Link>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/feed' })
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
