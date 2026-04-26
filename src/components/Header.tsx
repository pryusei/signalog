import Link from 'next/link'

import { auth, signOut } from '@/lib/auth'

export async function Header() {
  const session = await auth()

  return (
    <header className="border-b border-gray-100 bg-white">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/feed" className="text-lg font-bold text-gray-900">
          Signalog
        </Link>

        <nav className="flex items-center gap-4">
          <Link href="/discover" className="text-sm text-gray-600 hover:text-gray-900">
            企業を探す
          </Link>

          {session?.user ? (
            <>
              <Link href="/mypage" className="text-sm text-gray-600 hover:text-gray-900">
                マイページ
              </Link>
              <form
                action={async () => {
                  'use server'
                  await signOut({ redirectTo: '/feed' })
                }}
              >
                <button type="submit" className="text-sm text-gray-600 hover:text-gray-900">
                  ログアウト
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
            >
              ログイン
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
