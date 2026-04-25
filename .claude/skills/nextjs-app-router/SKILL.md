---
name: nextjs-app-router
description: Next.js 16 App Router のベストプラクティス。Signalog で Next.js のページ・API Route・コンポーネントを書く際は必ず参照すること。Server/Client Component の判断、async params、データフェッチパターン、キャッシュ戦略、Route Handlers の書き方をすべて含む。Next.js 16 は async params など 15 から大きく変わっているので、コードを書く前に必ずこのスキルを読むこと。
---

# Next.js 16 App Router ベストプラクティス

## Next.js 16 の主な変更点 (15 → 16)

### Turbopack がデフォルト
- `next dev` / `next build` ともに Turbopack が標準
- webpack の設定は不要。Turbopack 非互換のプラグインは使わない
- FS キャッシュで2回目以降の起動が高速

### async params (重要)
- ページコンポーネントの `params` / `searchParams` が Promise に変更
- 必ず `await` してから使う

```typescript
// ✅ Next.js 16 の正しい書き方
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <h1>{slug}</h1>
}

// ❌ Next.js 15 までの書き方 (動かない)
export default function Page({ params }: { params: { slug: string } }) {
  return <h1>{params.slug}</h1>
}
```

### React Compiler (stable)
- `next.config.ts` に `reactCompiler: true` で有効化
- 手動の `useMemo` / `useCallback` は不要になる

## Server Component vs Client Component

### 判断基準

**Server Component (デフォルト) を使う場合:**
- データフェッチが必要
- DB / API に直接アクセスする
- シークレットを使う処理
- 状態を持たない表示のみのコンポーネント

**Client Component (`'use client'`) を使う場合:**
- `useState` / `useEffect` が必要
- ブラウザAPI(localStorage, window等)を使う
- イベントハンドラ(onClick, onChange等)が必要
- サードパーティのクライアントライブラリを使う

### パターン: Server → Client の境界

```
ServerLayout          ← Server Component
├── ServerHeader      ← Server Component (データ取得)
│   └── ClientSearch  ← Client Component (状態あり)
├── ServerFeedList    ← Server Component (記事一覧取得)
│   └── ClientLikeButton ← Client Component (いいね操作)
└── ServerFooter      ← Server Component
```

**ポイント**: Client Component は木の末端に置く。

## データフェッチ

### Server Component でのフェッチ

```typescript
// app/(main)/feed/page.tsx
import { db } from '@/lib/db/server'
import { articles } from '@/lib/db/schema'
import { desc } from 'drizzle-orm'

export default async function FeedPage() {
  const result = await db
    .select()
    .from(articles)
    .orderBy(desc(articles.publishedAt))
    .limit(20)

  return <ArticleList articles={result} />
}
```

### Route Handlers (API Routes)

```typescript
// app/api/follows/route.ts
import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
      { status: 401 }
    )
  }
  const { companyId } = await req.json()
  // フォロー処理...
  return Response.json({ data: { ok: true } })
}
```

## キャッシュ戦略

Next.js 16 ではデフォルトでキャッシュが無効。明示的に設定する。

**Signalog での方針:**

| ページ/API | revalidate | 理由 |
|---|---|---|
| `/feed` (フィード) | 300 (5分) | 新着記事の反映と負荷のバランス |
| `/discover` (企業一覧) | 3600 (1時間) | 企業データはあまり変わらない |
| `/api/feed` | キャッシュなし | 動的、ユーザー固有 |
| `/api/follows` | キャッシュなし | ユーザー固有 |
| `/mypage` | キャッシュなし | ユーザー固有 |

```typescript
// 静的キャッシュの設定例
export const revalidate = 300 // 5分

export default async function FeedPage() {
  // ...
}
```

## エラーハンドリング

- 各セグメントに `error.tsx` を配置(Server Component のエラー境界)
- 各セグメントに `not-found.tsx` を配置(404)
- `loading.tsx` で Suspense フォールバック

## Suspense 境界

```typescript
import { Suspense } from 'react'

export default function FeedPage() {
  return (
    <div>
      <Suspense fallback={<FeedSkeleton />}>
        <ArticleList />
      </Suspense>
    </div>
  )
}
```

## 禁止事項

- `'use server'` アクション内で `'use client'` の関数を直接呼ばない
- Server Component から Client Component に関数を props として渡さない (シリアライズ不可)
- Client Component で `process.env.SECRET` のような非 `NEXT_PUBLIC_` 変数を参照しない
