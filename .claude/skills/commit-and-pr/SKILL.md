---
name: commit-and-pr
description: Signalog のコミット・PR 作成手順。コードを書き終えてコミットや PR 作成を行う際は必ず参照すること。コミットメッセージ規約、PR タイトル規約、PR テンプレートの使い方、レビュー前のチェックリストを含む。git commit や gh pr create を実行する前に必ず読むこと。
---

# コミット・PR 作成手順

## コミット前チェック

コミット前に必ず以下を実行:

```bash
pnpm tsc --noEmit          # TypeScript 型チェック
pnpm lint                  # ESLint
pnpm prettier --write .    # フォーマット
pnpm build                 # ビルド成功確認
```

## コミットメッセージ

形式:

```
<type>(<scope>): <description>
```

- **type**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `ci`
- **scope**: `auth`, `feed`, `company`, `crawler`, `infra`, `db`, `follow`, `mypage`
- **description**: 50文字以内、日本語可、命令形

例:

```bash
git commit -m "feat(auth): Google OAuth ログイン画面を実装"
git commit -m "fix(crawler): RSS パース時の XXE 対策を追加"
git commit -m "docs(infra): CI/CD ワークフローの仕様を記載"
git commit -m "chore(infra): ESLint + Prettier 設定を追加"
```

## ブランチ命名

```
feature/SGL-<番号>-<short-description>
```

例:

- `feature/SGL-001-infrastructure`
- `feature/SGL-003-auth`

## PR 作成手順

### 1. ブランチをプッシュ

```bash
git push -u origin feature/SGL-001-infrastructure
```

### 2. PR 作成 (gh CLI)

```bash
gh pr create \
  --title "[SGL-001] プロジェクト基盤セットアップ" \
  --body-file .github/pull_request_template.md \
  --base main \
  --label "phase:1,scope:infra"
```

### PR タイトル規約

```
[SGL-<番号>] <短い説明>
```

例:

- `[SGL-001] プロジェクト基盤セットアップ`
- `[SGL-003] NextAuth.js 認証 (Google/GitHub)`

### 3. PR 本文に含めるもの

- 関連 Issue: `Closes #<番号>` (Issue 番号は GitHub の自動採番 = SGL 番号とは別)
- 変更内容のサマリ
- スクリーンショット (UI 変更時)
- テスト方法
- 仕様書からの逸脱があれば明記

## PR レビュー前のセルフチェック

- [ ] CI が通っている (TypeScript + ESLint + Prettier + Build)
- [ ] 仕様書の完了条件をすべて満たしている
- [ ] `console.log` などのデバッグコードを削除した
- [ ] シークレットがハードコードされていない
- [ ] 認可チェックが必要な API に `auth()` 呼び出しがある
- [ ] ユーザー入力に Zod バリデーションがある
- [ ] DB クエリに型安全性がある (生 SQL 使っていない)
- [ ] エラーハンドリングがある (try/catch / Result型)

## マージ条件

- CI 通過
- レビュー承認 (1人体制なら省略可、ただしセルフレビューを必ず実施)
- 関連 Issue がリンクされている
- main へのマージ後、Issue は自動クローズ (Closes キーワード使用時)

## マージ後

```bash
git checkout main
git pull
git branch -d feature/SGL-001-infrastructure
```

## 禁止事項

- main ブランチへの直接 push
- CI が落ちている状態でのマージ
- 仕様書を更新せずに仕様変更を実装
- 1つの PR に複数チケット分の変更を含める
