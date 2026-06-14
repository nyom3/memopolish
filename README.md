# MemoPolish / PhraseBridge

MemoPolish は「PCとスマホでフレーズを共有する」ことに特化した PhraseBridge です。  
AI 加工（推敲 / 敬語化 / 要点抽出）は任意機能として提供します。

## 主な機能

- 共有ルームID（内部名: bucket_id）を使ったデバイス間同期
- フレーズ保存・一覧表示・コピー・削除
- 期限切れ（7日）を考慮した整理
- 操作フィードバック（スピナー / トースト / 未保存表示）
- AI 加工（推敲 / 敬語化 / 要点抽出）
- PWA（ホーム画面追加）

## セットアップ

1) 依存関係をインストール

```bash
npm install
```

2) 環境変数を設定（`.env.local`）

```bash
# クライアントから参照される
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# サーバーのみで参照される（ブラウザに出さない）
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# 任意: keep-alive API を Bearer token で保護する
KEEPALIVE_TOKEN=YOUR_KEEPALIVE_TOKEN

# Gemini API
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

3) 開発サーバー起動

```bash
npm run dev
```

`http://localhost:3000` にアクセスします。

## 仕様の要点

- 共有ルームID（内部名: bucket_id / 22文字以上）で同期
- 編集キー（内部名: write_key）は保存・削除用の鍵
- write_key_hash（SHA-256）で削除・整理を保護
- 期限切れ（created_at + 7日）は非表示、cleanupで削除
- 200件を超える場合は古いものを削除して上限維持
- AI 加工 API は `text` 2000文字以内、`extraInstruction` 500文字以内

## 開発スクリプト

- `npm run dev`
- `npm test`
- `npm run build`
- `npm run start`
- `npm run lint`

## Supabase keep-alive

Supabase 無料プロジェクトの pause 回避用に、`GET /api/keepalive` を用意しています。  
この API は anon key の `supabaseClient` で `phrases` を 1 件だけ読み取り、成功時に `{ "ok": true }` を返します。service role は使いません。

GitHub Actions の `.github/workflows/keepalive.yml` は日次 cron と手動実行に対応しています。  
Repository Secrets に `KEEPALIVE_URL` を設定してください。任意で `KEEPALIVE_TOKEN` を設定すると、workflow は `Authorization: Bearer ...` を付けて呼び出します。

例:

```text
KEEPALIVE_URL=https://your-production-domain.example
KEEPALIVE_TOKEN=your-random-token
```

## PWA 確認手順

1) ローカルで `npm run dev` を起動
2) Android Chrome
3) 右上メニュー →「ホーム画面に追加」
4) 追加後、ホーム画面から起動できることを確認
5) iOS Safari
6) 共有ボタン →「ホーム画面に追加」
7) 追加後、ホーム画面から起動できることを確認

## 関連ドキュメント

- `dev-instruction.md`: 開発指示とMVP方針
- `spec.md`: 仕様（UI/データ/フロー）
- `how-to-work.md`: 作業手順
- `tech-stack.md`: 技術スタック
- `docs/app-overview.md`: アプリの仕組み解説
- `CHANGELOG.md`: 変更履歴
