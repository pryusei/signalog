import Parser from 'rss-parser'

const parser = new Parser({
  timeout: 10_000,
  headers: {
    'User-Agent': 'SignalogBot/1.0 (+https://signalog.app/bot)',
  },
})

export interface FeedItem {
  title: string
  link: string
  pubDate: string
}

export async function fetchRssFeed(feedUrl: string): Promise<FeedItem[]> {
  const feed = await parser.parseURL(feedUrl)
  return feed.items
    .filter((item) => Boolean(item.title && item.link && (item.pubDate ?? item.isoDate)))
    .map((item) => ({
      title: item.title!,
      link: item.link!,
      pubDate: (item.pubDate ?? item.isoDate)!,
    }))
}
