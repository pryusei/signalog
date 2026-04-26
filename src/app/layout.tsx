import type { Metadata } from 'next'
import { Geist } from 'next/font/google'

import { Header } from '@/components/Header'

import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Signalog',
  description: '企業のテックブログとプレスリリースを一元的にフォローできるプラットフォーム',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" className={`${geist.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-gray-50">
        <Header />
        <div className="flex-1">{children}</div>
      </body>
    </html>
  )
}
