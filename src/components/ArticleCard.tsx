'use client'

import Link from 'next/link'

import type { ArticleWithCompany } from '@/app/api/feed/route'

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `${Math.max(1, m)}分前`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}時間前`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}日前`
  return new Date(iso).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
}

function LogoTile({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  if (logoUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={logoUrl}
        alt={name}
        width={44}
        height={44}
        className="h-11 w-11 shrink-0 rounded-xl object-contain"
        onError={(e) => {
          ;(e.currentTarget as HTMLImageElement).style.display = 'none'
        }}
      />
    )
  }
  return (
    <div className="bg-sg-accent-soft text-sg-accent-deep flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
      {name.slice(0, 2)}
    </div>
  )
}

export function ArticleCard({ article }: { article: ArticleWithCompany }) {
  return (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group border-sg-line bg-sg-surface hover:border-sg-accent-soft flex gap-4 rounded-2xl border p-4 transition-all hover:shadow-sm"
    >
      <LogoTile name={article.company.name} logoUrl={article.company.logoUrl} />

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
          <span
            className={`rounded px-1.5 py-0.5 font-semibold ${
              article.feedType === 'tech'
                ? 'bg-sg-accent-soft text-sg-accent-deep'
                : 'bg-sg-warm-soft text-sg-warm'
            }`}
          >
            {article.feedType === 'tech' ? 'Tech Blog' : 'Press'}
          </span>
          <Link
            href={`/companies/${article.company.slug}`}
            className="text-sg-ink-soft hover:text-sg-accent-deep font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            {article.company.name}
          </Link>
          <span className="text-sg-ink-faint">· {formatRelative(article.publishedAt)}</span>
        </div>

        <p className="text-sg-ink group-hover:text-sg-accent-deep mb-1 line-clamp-2 text-[15px] leading-snug font-semibold">
          {article.title}
        </p>
      </div>

      {article.ogpImageUrl && (
        <div className="hidden shrink-0 sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.ogpImageUrl}
            alt=""
            width={88}
            height={64}
            className="h-16 w-[88px] rounded-lg object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
    </a>
  )
}
