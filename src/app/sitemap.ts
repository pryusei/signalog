import type { MetadataRoute } from 'next'

import { db } from '@/lib/db/server'
import { companies } from '../../db/schema'

// ビルド時は DB に接続できない (CI はプレースホルダ URL) ため、リクエスト時に生成する
export const dynamic = 'force-dynamic'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://signalog.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/discover`,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  let companyList: { slug: string; updatedAt: Date }[] = []
  try {
    companyList = await db
      .select({ slug: companies.slug, updatedAt: companies.updatedAt })
      .from(companies)
  } catch {
    // DB 障害時も静的ページだけの sitemap を返す (500 でクローラーに嫌われない)
  }

  const companyPages: MetadataRoute.Sitemap = companyList.map((c) => ({
    url: `${SITE_URL}/companies/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticPages, ...companyPages]
}
