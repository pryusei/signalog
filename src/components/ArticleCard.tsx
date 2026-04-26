import Image from 'next/image'

import type { ArticleWithCompany } from '@/app/api/feed/route'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function ArticleCard({ article }: { article: ArticleWithCompany }) {
  return (
    <a
      href={article.sourceUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          {article.company.logoUrl ? (
            <Image
              src={article.company.logoUrl}
              alt={article.company.name}
              width={20}
              height={20}
              className="h-5 w-5 rounded object-contain"
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded bg-gray-100 text-xs font-bold text-gray-400">
              {article.company.name[0]}
            </div>
          )}
          <span className="text-sm text-gray-500">{article.company.name}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${
              article.feedType === 'tech'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-green-50 text-green-600'
            }`}
          >
            {article.feedType === 'tech' ? 'Tech' : 'Press'}
          </span>
        </div>
        <p className="mb-1 line-clamp-2 font-medium text-gray-900 group-hover:text-blue-600">
          {article.title}
        </p>
        <p className="text-xs text-gray-400">{formatDate(article.publishedAt)}</p>
      </div>
      {article.ogpImageUrl && (
        <div className="hidden shrink-0 sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element -- onError フォールバックのため img を使用 */}
          <img
            src={article.ogpImageUrl}
            alt=""
            width={120}
            height={68}
            className="h-17 w-30 rounded-md object-cover"
            onError={(e) => {
              ;(e.currentTarget as HTMLImageElement).style.display = 'none'
            }}
          />
        </div>
      )}
    </a>
  )
}
