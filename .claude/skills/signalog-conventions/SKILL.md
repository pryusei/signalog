---
name: signalog-conventions
description: Signalog プロジェクトのコーディング規約。Signalog リポジトリでコードを書く際は必ずこのスキルを参照すること。TypeScript の書き方、ファイル命名、コンポーネント設計、import 順序、Tailwind の使い方、API Route の設計、Git コミットメッセージ規約、セキュリティ要件をすべて含む。実装前に必ず読み込むこと。
---

# Signalog コーディング規約

## TypeScript

- `strict: true` を維持。`any` は使わない
- 型定義は `interface` 優先(`type` はユニオン型・交差型にのみ使う)
- Enum は使わない。`as const` オブジェクトまたはユニオンリテラル型を使う
- 非null アサーション (`!`) は使わない。適切なガードまたは Optional Chaining を使う

```typescript
// Good
interface Article {
  id: string
  title: string
  type: 'tech' | 'press'
}

// Bad
type Article = {
  id: any
  title: string
  type: ArticleType  // Enum
}
```

## ファイル命名

| 対象 | 規則 | 例 |
|------|------|-----|
| コンポーネント | PascalCase | `ArticleCard.tsx` |
| フック | camelCase(use接頭辞) | `useFollows.ts` |
| ユーティリティ | camelCase | `formatDate.ts` |
| 型定義 | camelCase | `types.ts` |
| API Route | `route.ts`(Next.js規約) | `app/api/feed/route.ts` |
| ページ | `page.tsx`(Next.js規約) | `app/(main)/feed/page.tsx` |
| テスト | `.test.ts` または `.test.tsx` | `ArticleCard.test.tsx` |

## コンポーネント設計

- Server Component をデフォルト。`'use client'` は必要な場合のみ
- クライアント状態が必要なコンポーネントは最小単位で `'use client'` を付ける
- props の型は同ファイル内で定義。共有型は `src/lib/types.ts`

```typescript
// Good: Server Component (default)
export default async function FeedPage() {
  const articles = await getArticles()
  return <ArticleList articles={articles} />
}

// Good: 最小単位で Client Component
'use client'
export function FollowButton({ companyId }: { companyId: string }) {
  const [isFollowing, setIsFollowing] = useState(false)
  // ...
}
```

## import 順序

```typescript
// 1. React / Next.js
import { Suspense } from 'react'
import Link from 'next/link'

// 2. 外部ライブラリ
import { eq } from 'drizzle-orm'

// 3. 内部モジュール(@/ alias)
import { db } from '@/lib/db/server'
import { ArticleCard } from '@/components/ArticleCard'

// 4. 型(type import)
import type { Article } from '@/lib/types'
```

## Tailwind CSS

- インラインクラスが長くなったら `cn()` ヘルパー(clsx + tailwind-merge)を使う
- カスタムカラーは `tailwind.config.ts` の `theme.extend.colors` で定義
- `@apply` は使わない(Tailwind v4 では非推奨寄り)

## API Routes

- HTTP メソッドごとに named export: `GET`, `POST`, `DELETE`
- バリデーションは Zod を使う
- 認可は必ずアプリ層で実施(`getServerSession()` でセッション取得 → `where(eq(table.userId, session.user.id))`)
- エラーレスポンスは統一フォーマット:

```typescript
// Success
return Response.json({ data: articles })

// Error
return Response.json(
  { error: { code: 'UNAUTHORIZED', message: 'ログインが必要です' } },
  { status: 401 }
)
```

## Git コミットメッセージ

```
<type>(<scope>): <description>

type: feat, fix, docs, style, refactor, test, chore, ci
scope: auth, feed, company, crawler, infra, db, follow, mypage
```

例:
- `feat(auth): Google OAuth ログイン画面を実装`
- `fix(crawler): RSS パース時の XXE 対策を追加`
- `docs(infra): CI/CD ワークフローの仕様を記載`
- `chore(infra): ESLint + Prettier 設定を追加`

## セキュリティ

- ユーザー入力は必ずサーバーサイドでバリデーション(Zod)
- 外部データ(RSS等)は必ずサニタイズしてからDBに保存(DOMPurify)
- 環境変数のシークレットは `NEXT_PUBLIC_` を付けない
- SQL インジェクション対策: Drizzle ORM のパラメータバインディングを使う(生 SQL は禁止)
- API Route には認証チェックミドルウェアを必ず挟む(公開APIを除く)
- 認可は DB クエリの `where` 句で実施(RLS は使わない)
