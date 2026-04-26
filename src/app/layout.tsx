import type { Metadata } from 'next'
import { Inter, Zen_Maru_Gothic } from 'next/font/google'

import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const zenMaruGothic = Zen_Maru_Gothic({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-zen',
})

export const metadata: Metadata = {
  title: 'Signalog',
  description: '企業のテックブログとプレスリリースを一元的にフォローできるプラットフォーム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${inter.variable} ${zenMaruGothic.variable} h-full antialiased`}>
      <body className="bg-sg-bg text-sg-ink h-full">{children}</body>
    </html>
  )
}
