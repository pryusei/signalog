import type { MetadataRoute } from 'next'

import { db } from '@/lib/db/server'
import { companies } from '../../db/schema'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://signalog.vercel.app'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const companyList = await db.select({ slug: companies.slug, updatedAt: companies.updatedAt }).from(companies)

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/discover`,
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  const companyPages: MetadataRoute.Sitemap = companyList.map((c) => ({
    url: `${SITE_URL}/companies/${c.slug}`,
    lastModified: c.updatedAt,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  return [...staticPages, ...companyPages]
}
