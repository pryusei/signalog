# Signalog

> 企業のテックブログとプレスリリースを一元的にフォローできるプラットフォーム

## このファイルについて

Claude Code がこのプロジェクトで作業する際、最初にこのファイルを読み込む。
プロジェクト全体の文脈と、参照すべきドキュメント・スキルへの導線を示す。

## プロダクト概要

Signalog は「気になる企業をフォローするだけで、テックブログとプレスリリースがまとめて届く」サービス。
エンジニア・ビジネスパーソン向け。個人ユーザーは完全無料。マネタイズは企業向けプロモーション・求人掲載 (Phase 3 以降)。

## 技術スタック

- **Framework**: Next.js 16 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4
- **DB**: Neon (Serverless PostgreSQL)
- **ORM**: Drizzle ORM
- **Auth**: NextAuth.js (Auth.js v5) — Google / GitHub OAuth
- **Deploy**: Vercel
- **Crawler**: GitHub Actions (Phase 1) → AWS Lambda (Phase 2)
- **Monitoring**: Sentry + Plausible

## 現在のフェーズ

**Phase 1 — MVP**

8チケット構成で進行中:

- SGL-001: プロジェクト基盤
- SGL-002: DBスキーマ + Drizzle セットアップ
- SGL-003: NextAuth.js 認証
- SGL-004: 企業データモデル + シード投入
- SGL-005: 企業一覧・検索・フォロー機能
- SGL-006: RSSクローラー (GitHub Actions)
- SGL-007: フィード表示
- SGL-008: マイページ

詳細: `docs/phase1-spec-revised.md`

## 重要な設計判断

- **記事本文は保持しない**: タイトル・URL・公開日・OGP画像のみ
- **RSSベースの取得**: スクレイピングではなく RSS/Atom フィードから取得
- **アプリ層認可**: PostgreSQL RLS は使わず、Drizzle の `where` 句で認可
- **カーソルページネーション**: `(published_at DESC, id DESC)` でページング
- **OGP画像は直接参照**: Vercel Image Optimization は使わない (Phase 1)
- **クロール間隔は3時間**: GitHub Actions Free 枠内に収める

## 重要なディレクトリ

```
docs/                  ← 仕様書 (実装前に必ず読む)
.claude/skills/        ← Claude 用スキル (自動的に参照される)
src/                   ← Next.js アプリケーション
crawler/               ← RSS クローラー (GitHub Actions で実行)
db/                    ← Drizzle スキーマ・マイグレーション・シード
```

## 作業時の必須参照

実装前に必ず以下を読むこと:

| 作業内容            | 参照すべきもの                                     |
| ------------------- | -------------------------------------------------- |
| あらゆる実装        | `.claude/skills/signalog-conventions/SKILL.md`     |
| Next.js コード      | `.claude/skills/nextjs-app-router/SKILL.md`        |
| DB スキーマ・クエリ | `.claude/skills/drizzle-neon/SKILL.md`             |
| RSSクローラー       | `.claude/skills/rss-crawler/SKILL.md`              |
| コミット・PR 作成   | `.claude/skills/commit-and-pr/SKILL.md`            |
| チケット実装        | `docs/<NNN>-<name>/spec.md` (該当チケットの仕様書) |

## 作業フロー

1. 着手するチケットを Issue から選ぶ
2. 対応する仕様書 (`docs/`) を読む
3. ブランチを切る: `feature/SGL-NNN-<short-desc>`
4. 実装 (関連スキルを参照)
5. セルフチェック (`pnpm tsc --noEmit && pnpm lint && pnpm build`)
6. コミット (`<type>(<scope>): <description>` 形式)
7. PR 作成 (`gh pr create`)

## Claude へのルール (必ず守ること)

**コードを変更したら必ず PR を出す。どんな小さな修正でも例外なし。**

手順:

1. `git checkout main && git pull`
2. `git checkout -b <branch-name>`
3. 実装・修正
4. `git push -u origin <branch-name>`
5. `gh pr create`

hotfix・バグ修正・スタイル変更・ワークフロー修正も含め、すべて PR 経由でマージする。
main への直接 push は絶対禁止。

## 禁止事項

- main ブランチへの直接 push (PR なしのコミット・プッシュを含む)
- 記事本文の DB 保存
- スクレイピング (RSS 以外の方法での記事取得)
- RLS への依存 (Phase 1 はアプリ層認可)
- 認可なしのユーザー固有データ取得
- 仕様書を更新せずに仕様変更を実装
