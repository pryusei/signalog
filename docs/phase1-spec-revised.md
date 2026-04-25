# Signalog Phase 1 — 修正版仕様サマリ

> 既存の構想ドキュメント(全ドキュメント版)に対するレビュー結果を反映した、Phase 1 着手用の仕様サマリ。
> 本ドキュメントは既存の `docs/product-vision.md` を **置き換えるものではなく**、
> Phase 1 のスコープと設計判断を確定させるための **追補ドキュメント** として扱う。

*作成日: 2026-04-25*

---

## 1. このドキュメントの位置づけ

既存の構想ドキュメントは「理想形 → フェーズ対応」の俯瞰には優れているが、
Phase 1 を実装に進める粒度で見ると以下の問題があった。

- チケット粒度が粗く、SGL-003 と SGL-005 が肥大化する
- 認可方式(RLS vs アプリ層)が決まっていない
- RSS 記事の重複検知ロジックが未定義
- CSP / OGP画像 / ページネーション方式 など、後から手戻りすると痛い設計判断が未確定
- AI要約(Phase 2)と「本文を保持しない」方針が矛盾している

本ドキュメントでは、**Phase 1 着手前に確定すべき設計判断** と **再整理したチケット構成** をまとめる。

---

## 2. 確定する設計判断(5項目)

### 2.1 認可方式: アプリ層認可を採用(RLS は使わない)

**判断**: PostgreSQL RLS を Phase 1 では使わず、Drizzle ORM のクエリビルダで `where` 句を組み立てるアプリ層認可とする。

**理由**:
- NextAuth.js は Neon に対してアプリケーションロール1つで接続するため、`auth.uid()` 相当が動かない
- Neon の `pg_session_jwt` を使う方式は設定が重く、Phase 1 のスコープ外
- Drizzle は型安全な `where` 句を提供するため、認可漏れはコードレビューで検出可能

**実装ルール**:
- すべての API Route の冒頭で `getServerSession(authOptions)` を呼び、`session.user.id` を取得
- ユーザー固有データ(follows, likes 等)を扱うクエリには必ず `where(eq(table.userId, session.user.id))` を含める
- 公開データ(companies, articles)は認可不要だが、フォロー一覧等のフィルタ済みデータは認可必須

**Phase 2 以降の見直し**: マルチテナント(チーム機能)を導入する場合、RLS への移行を再検討する。

### 2.2 記事の重複検知キー: `(company_id, normalized_url)` の複合一意制約

**判断**: RSS の `<guid>` は信頼できないフィードがあるため使わず、URL を正規化したものをキーとする。

**正規化ルール**:
- スキームを `https` に統一(`http` → `https`)
- 末尾スラッシュを除去
- フラグメント(`#...`)を除去
- トラッキングパラメータ(`utm_*`, `fbclid`, `gclid`, `ref`, `source`)を除去
- それ以外のクエリパラメータは保持(記事IDの場合があるため)

**スキーマ**:
```sql
CREATE UNIQUE INDEX articles_company_url_idx
  ON articles (company_id, normalized_url);
```

**実装場所**: `crawler/normalize.ts` に `normalizeUrl(url: string): string` を実装し、
クローラーと表示両方で使う。

### 2.3 クロール戦略: 並列実行 + 3時間間隔(Phase 1)

**判断**: 「1時間ごと」は GitHub Actions Free 枠を超過するリスクがあるため、Phase 1 では3時間間隔とする。

**根拠**:
- 100社 × RSS取得 × 並列度10 = 1回あたり 約2-3分(タイムアウト含む)
- 3時間間隔 × 30日 = 240回/月
- 3分 × 240回 = 720分/月(Free 2,000分/月の36%)

**並列実行の方針**:
- `Promise.allSettled` で全企業のRSS取得を並列実行(並列度上限10、`p-limit` 使用)
- 1社あたり10秒のタイムアウト
- 失敗した企業は次回に再試行(エラーログのみ、リトライキューは不要)

**Phase 2 以降の見直し**: 企業数が200社を超えるか、リアルタイム性が要求された時点で AWS Lambda + EventBridge に移行し、1時間以下の間隔を検討する。

### 2.4 OGP画像: 直接参照(Vercel Image Optimization は使わない)

**判断**: Phase 1 では OGP画像URLをDBに保存し、`<img>` タグで直接参照する。Next.js の `<Image>` コンポーネントは使わない(または `unoptimized` で使う)。

**理由**:
- Vercel Image Optimization の無料枠は1,000枚/月。100社 × 10記事/週 = 1,000枚/週で即超過
- OGP画像は元サイトのCDNにあり、可用性も元サイトに依存して問題ない
- 画像最適化のコストを払うほどの体験差は Phase 1 では発生しない

**実装ルール**:
- `articles.ogp_image_url` カラムにURL文字列で保存
- 表示側は `<img src={article.ogpImageUrl} loading="lazy" />` または `<Image unoptimized />`
- 画像取得失敗時のフォールバック画像を1枚用意(`/public/fallback-ogp.png`)

**Phase 2 以降の見直し**: 有料プランに移行するタイミングで Vercel Image Optimization か Cloudflare Images への移行を検討。

### 2.5 ページネーション方式: カーソルベース(`publishedAt + id`)

**判断**: OFFSET ベースは記事追加で重複/欠落が出るため、`(published_at, id)` の複合カーソルを採用。

**API設計**:
```
GET /api/feed?cursor=<base64>&limit=20

Response:
{
  data: Article[],
  nextCursor: string | null  // null なら次ページなし
}
```

**カーソル形式**:
- `{ publishedAt: ISO8601, id: string }` を JSON 化して base64 エンコード
- 同じ `publishedAt` の記事を確実にページングするため `id` を tiebreaker に含める

**クエリ**:
```ts
.where(
  or(
    lt(articles.publishedAt, cursor.publishedAt),
    and(
      eq(articles.publishedAt, cursor.publishedAt),
      lt(articles.id, cursor.id)
    )
  )
)
.orderBy(desc(articles.publishedAt), desc(articles.id))
.limit(limit)
```

**インデックス**: `CREATE INDEX articles_pub_id_idx ON articles (published_at DESC, id DESC);`

---

## 3. その他の修正項目

### 3.1 CSP の段階的強化

**現状の問題**: `script-src` に `'unsafe-inline' 'unsafe-eval'` を許可しているため、セキュリティヘッダー設定の意味が薄い。

**Phase 1**: 現状の緩い CSP のままで進める(Next.js のインラインスクリプトを許可するため)。
**Phase 2**: nonce ベースの CSP に移行(Next.js 16 公式サポートあり)。

**仕様書への追記**: `docs/001-infrastructure/spec.md` の CSP 設定箇所に
「Phase 1 は緩い設定。Phase 2 で nonce ベースに移行予定」のコメントを残す。

### 3.2 AI要約のための本文取得設計

**Phase 2 で必要になる前提**: 「Top 3 記事の AI 要約」を実装するには本文が必要だが、「記事本文は保持しない」方針と矛盾する。

**Phase 2 の方針(Phase 1 では実装しない)**:
- 要約生成時にだけ元記事URLを fetch する(週3回なので低負荷・合法的)
- 取得した本文は要約生成のメモリ上でのみ使用、DB には保存しない
- 要約結果(数百文字)のみ `articles.ai_summary` カラムに保存

**Phase 1 での準備**:
- `articles` テーブルに以下のカラムを Phase 1 から含めておく(NULL 許可):
  - `ai_summary TEXT NULL`
  - `ai_summary_generated_at TIMESTAMPTZ NULL`
- カラムを後から追加すると Neon の無料枠ではマイグレーションに時間がかかるため

### 3.3 RSS 記事の表示範囲

**Phase 1 のスコープ**:
- ✅ タイトル
- ✅ 元記事へのリンク
- ✅ 公開日
- ✅ OGP画像(サムネイル)
- ✅ 企業名・企業ロゴ
- ❌ 本文の抜粋・description(Phase 2 で著作権要件を整理してから判断)
- ❌ 著者名(取得できない場合があるため)

**理由**: タイトル + リンク + 公開日 + サムネイルまでは確実にセーフ。
RSS の `<description>` をそのまま表示すると再配信扱いになるリスクがあるため Phase 1 では出さない。

### 3.4 Next.js プロジェクト初期化フラグの明示

**現状の問題**: `pnpm create next-app@latest --yes` のデフォルトはバージョンによって変わるため、明示的にフラグを指定する。

**正しいコマンド**:
```bash
pnpm create next-app@latest signalog \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*" \
  --use-pnpm
```

`docs/001-infrastructure/spec.md` のコマンドを上記に差し替える。

### 3.5 企業の一意キー

**判断**: `companies.slug`(例: `mercari`)を一意キーとする。`domain` も持つが一意制約は付けない。

**理由**:
- M&A や子会社化で `domain` が変わることがある(例: Indeed → Recruit 傘下)
- URL に使えるのは `slug`(`/companies/mercari`)
- 検索や表示の主軸は `name` だが、人間の編集ミスで重複しやすい

**スキーマ**:
```sql
CREATE TABLE companies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT UNIQUE NOT NULL,
  name        TEXT NOT NULL,
  domain      TEXT NOT NULL,
  logo_url    TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 4. 再整理した Phase 1 チケット構成

既存の SGL-001〜005(5チケット)を、依存関係と作業量に応じて 8チケットに分割。

| ID | タイトル | 依存 | 想定工数 | 主な成果物 |
|---|---|---|---|---|
| SGL-001 | プロジェクト基盤 | - | 1-2日 | Next.js 16 + CI + Vercel + Neon 接続 |
| SGL-002 | DBスキーマ + Drizzle セットアップ | 001 | 1日 | `db/schema.ts`、マイグレーション、型定義 |
| SGL-003 | NextAuth.js 認証 | 002 | 1-2日 | Google / GitHub OAuth、セッション管理 |
| SGL-004 | 企業データモデル + シード投入 | 002 | 1日 | 50-100社の初期データ、`db/seed/companies.ts` |
| SGL-005 | 企業一覧・検索・フォロー機能 | 003, 004 | 2-3日 | `/discover`、`FollowButton`、`/api/follows` |
| SGL-006 | RSSクローラー(GitHub Actions) | 004 | 2-3日 | `crawler/`、`.github/workflows/crawl.yml` |
| SGL-007 | フィード表示 | 005, 006 | 2-3日 | `/feed`、フィルタ、カーソルページネーション |
| SGL-008 | マイページ(フォロー中一覧) | 005 | 1日 | `/mypage`、フォロー解除UI |

**合計**: 11-16日(1人での実装想定)

### 4.1 並行作業可能なペア

```
SGL-001 → SGL-002 ┬→ SGL-003 ┐
                  │           ├→ SGL-005 ┬→ SGL-007
                  └→ SGL-004 ┬┘          └→ SGL-008
                             └→ SGL-006 ──┘
```

- SGL-003(認証)と SGL-004(企業データ)は SGL-002 完了後に並行可能
- SGL-006(クローラー)と SGL-005(フォロー機能)は並行可能
- SGL-007(フィード)が他のすべてに依存するため、最後に着手

### 4.2 既存仕様からの主な変更

| 既存 | 変更後 | 理由 |
|---|---|---|
| SGL-002: 認証 | SGL-002: DBスキーマ / SGL-003: 認証 に分離 | スキーマを最初に固めないと後続が並行できない |
| SGL-003: 企業データ・フォロー | SGL-004: 企業データ / SGL-005: フォロー機能 に分離 | データ整備とUI実装は性質が違う |
| SGL-005: フィード表示 | SGL-007: フィード / SGL-008: マイページ に分離 | マイページは認証境界が異なる |

---

## 5. Phase 1 完了の定義(再定義)

既存の成功指標(MAU 300人など)に加え、**機能観点での完了条件** を明確化する。

### 5.1 機能観点

- [ ] 未ログインで `/feed` を閲覧できる(全企業の最新記事が時系列で見える)
- [ ] Google または GitHub でログインできる
- [ ] `/discover` で企業を検索・ブラウズできる
- [ ] フォローボタンで企業をフォロー / アンフォローできる
- [ ] `/feed` をフォロー中企業のみに絞り込める(ログイン時)
- [ ] フィードを Tech Blog / Press でフィルタできる
- [ ] 記事カードをクリックすると元サイトに遷移する(本文は保持しない)
- [ ] フィードがカーソルベースで無限スクロールできる
- [ ] `/mypage` で自分のフォロー中企業を確認・解除できる
- [ ] RSSクローラーが3時間ごとに動き、新着記事をDBに保存する
- [ ] 重複記事が登録されない(`(company_id, normalized_url)` で一意制約)

### 5.2 非機能観点

- [ ] CI(TypeScript / ESLint / Prettier / Build)が PR で動く
- [ ] Vercel Preview デプロイが PR ごとに動く
- [ ] セキュリティヘッダーが本番レスポンスに付与されている
- [ ] Sentry にエラーが通知される(意図的にエラーを出して確認)
- [ ] Plausible で PV / ユーザー数が計測されている

---

## 6. 既存ドキュメントへの反映方法

本ドキュメントの内容は以下のように既存ドキュメントに反映する。

| 反映先 | 反映内容 |
|---|---|
| `docs/product-vision.md` | Phase 1 スコープのチェックリスト更新(8チケット構成への変更を反映) |
| `docs/001-infrastructure/spec.md` | プロジェクト初期化コマンドの修正、CSP のコメント追記 |
| `docs/002-auth/spec.md`(新設) | アプリ層認可方針の明記 |
| `docs/003-company/spec.md` | 企業の一意キー(slug)を明記 |
| `docs/004-crawler/spec.md` | URL正規化ルール、クロール間隔3時間、並列度10 を明記 |
| `docs/005-feed/spec.md` | カーソルページネーション、表示範囲(タイトル+リンク+公開日+OGP) |
| `claude/PROJECT.md` | 「重要な設計判断」から RLS の記述を削除、アプリ層認可に修正 |
| `claude/tickets/` | SGL-001〜008 の8チケットに再構成 |

---

## 7. 着手判断

以下に「YES」が付けば Phase 1 着手可能。

- [ ] 上記 5項目の設計判断(2.1〜2.5)に同意する
- [ ] 8チケット構成での進行に同意する
- [ ] Phase 2 で AI要約のために本文を都度取得する方針に同意する
- [ ] Phase 1 で `description` を表示しないことに同意する

判断が分かれる項目があれば、その項目を再検討してから SGL-001 に着手する。
