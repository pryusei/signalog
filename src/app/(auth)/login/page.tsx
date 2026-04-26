import { signIn } from '@/lib/auth'

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200">
      <div className="mb-8 text-center">
        <p className="mb-1 text-3xl font-black tracking-tight text-gray-900">Signalog</p>
        <p className="text-sm text-gray-500">
          企業のテックブログ・プレスリリースをまとめてフォロー
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <form
          action={async () => {
            'use server'
            await signIn('google', { redirectTo: '/feed' })
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition-colors hover:bg-gray-50 active:bg-gray-100"
          >
            <GoogleIcon />
            Google でログイン
          </button>
        </form>

        <form
          action={async () => {
            'use server'
            await signIn('github', { redirectTo: '/feed' })
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-gray-800 active:bg-gray-700"
          >
            <GitHubIcon />
            GitHub でログイン
          </button>
        </form>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        ログインすることで利用規約とプライバシーポリシーに同意したものとみなします
      </p>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}
