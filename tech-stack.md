# memopolish 技術スタック

この文書は `memopolish` の技術構成を分かりやすくまとめたものです。

## コア技術

- **Framework**: Next.js (v16.1.6)
- **Language**: TypeScript (v5)
- **UI Library**: React (v19.2.3)

## 主要ライブラリ

- **AI**: `@google/generative-ai`（Gemini API）
- **DB / Storage**: `@supabase/supabase-js`（Supabase）
- **Styling**: Tailwind CSS (v4)
- **Lint**: ESLint + eslint-config-next
- **PWA**: Service Worker + Web App Manifest

## サーバ構成

- Next.js Route Handler で API を実装
- 削除/cleanup はサーバ側で service role key を使用

## 開発・ビルド

- 開発サーバー: `next dev`
- 本番ビルド: `next build`
- パッケージ管理: npm
