# Repo Map

## 目的

この文書は、AI や人間が変更箇所を素早く当てるための地図。
path は workspace root 基準の repository relative path で読む。
そのため、設計方針や意思決定は含みません。

## Entry Points

- `src/app/page.tsx`
  - ホーム画面の入口
  - `PolishForm` を描画する薄いページ
- `src/app/layout.tsx`
  - ルートレイアウト
  - metadata、manifest、アイコン、Service Worker 登録をまとめる
- `src/components/PolishForm.tsx`
  - 主要 UI とクライアント側の中核ロジック
  - 保存、取得、コピー、削除導線、AI 操作、localStorage 管理の中心

## UI 関連

- `src/components/PolishForm.tsx`
  - 1 画面 UI 全体
  - 変更は最小差分で行う
- `src/app/globals.css`
  - 全体スタイル
- `src/components/ServiceWorkerRegister.tsx`
  - クライアント起動時の Service Worker 登録

## Business Logic 関連

- `src/app/api/polish/route.ts`
  - Gemini API 呼び出し
  - mode 検証、文字数制限、出力ポリシー
- `src/app/api/phrases/delete/route.ts`
  - 削除 API
  - `id + bucketId + writeKeyHash` の検証
- `src/app/api/phrases/cleanup/route.ts`
  - 期限切れ削除
  - 200 件上限維持
- `src/lib/supabaseClient.ts`
  - クライアント用 Supabase 接続
- `src/lib/supabaseAdmin.ts`
  - サーバ用 Supabase 接続

## Config 関連

- `package.json`
  - scripts、依存関係
- `tsconfig.json`
  - TypeScript 設定
  - `@/*` alias 定義
- `eslint.config.mjs`
  - lint 設定
- `next.config.ts`
  - Next.js 設定
- `public/manifest.webmanifest`
  - PWA manifest
- `public/sw.js`
  - Service Worker
  - API レスポンスはキャッシュしない

## ドキュメントの参照先

- [`AGENTS.md`](../AGENTS.md)
  - repo 固有ルール
- [`README.md`](../README.md)
  - 概要、セットアップ、主要コマンド
- [`spec.md`](../spec.md)
  - 仕様の正本に近い文書
- [`docs/app-overview.md`](./app-overview.md)
  - データの流れと責務の説明
- [`docs/invariants.yml`](./invariants.yml)
  - repo 固有の硬い不変条件の正本
- [`dev-instruction.md`](../dev-instruction.md)
  - ピボット背景と UX 要件
- [`tech-stack.md`](../tech-stack.md)
  - 技術構成
- [`how-to-work.md`](../how-to-work.md)
  - ローカル確認手順

## 変更目的ごとの参照先

- UI 文言や導線を変えたい
  - まず `src/components/PolishForm.tsx`
- 画面全体の metadata や PWA 登録を変えたい
  - まず `src/app/layout.tsx`
  - 次に `public/manifest.webmanifest`
- AI モードや AI 制約を変えたい
  - まず `src/app/api/polish/route.ts`
  - 次に `spec.md`
- Supabase 接続方法を変えたい
  - まず `src/lib/supabaseClient.ts`
  - サーバ側は `src/lib/supabaseAdmin.ts`
- 削除や cleanup の保護条件を変えたい
  - まず `src/app/api/phrases/delete/route.ts`
  - 次に `src/app/api/phrases/cleanup/route.ts`
  - 仕様影響は `spec.md` を確認
- PWA キャッシュを触りたい
  - まず `public/sw.js`
  - API キャッシュ禁止を崩さない
- 環境変数やセットアップを変えたい
  - まず `README.md`
  - 必要に応じて `AGENTS.md`
