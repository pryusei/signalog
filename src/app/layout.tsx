import type { Metadata } from 'next'
import { Inter, Zen_Maru_Gothic } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const zenMaruGothic = Zen_Maru_Gothic({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-zen',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://signalog.vercel.app'
const DESCRIPTION = '企業のテックブログとプレスリリースを一元的にフォローできるプラットフォーム'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Signalog',
    template: '%s | Signalog',
  },
  description: DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: 'Signalog',
    title: 'Signalog',
    description: DESCRIPTION,
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Signalog',
    description: DESCRIPTION,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${zenMaruGothic.variable} h-full antialiased`}>
      <body className="bg-sg-bg text-sg-ink h-full">
        {children}
        <Analytics />
      </body>
    </html>
  )
}
