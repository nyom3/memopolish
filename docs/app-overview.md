# PhraseBridge 仕組み解説（やさしめ）

## 1. ざっくり全体像

PhraseBridge は「共有ルームID」を使って、複数端末で同じフレーズ一覧を見られる小さなツールです。  
AI加工（推敲 / 敬語化 / 要点抽出）は任意で、保存やコピーはAIなしで完結します。

## 2. 画面と役割

- フレーズ入力: 送信前のテキストを入力
- 保存: AIなしでSupabaseに保存
- AI加工してコピー / 保存: AIで整えた結果をコピーまたは保存
- 共有ルームID: 同じIDの端末同士で一覧が共有
- 編集キー: 保存・削除の権限を持つキー
- フレーズ一覧: コピー / AI加工 / 削除

## 3. データの流れ

### 3.1 保存

1. 入力をバリデーション（空や長すぎる文字を弾く）
2. 共有ルームIDと編集キー（ハッシュ）を付けて保存
3. サーバAPIで古いデータの整理を実行
4. 最新一覧を再取得して画面更新

### 3.2 取得

1. 共有ルームIDで一覧を取得
2. 期限切れのデータは非表示

### 3.3 削除

1. サーバAPIに `id + bucket_id + write_key_hash` を送る
2. サーバ側で一致チェック
3. 一致したものだけ削除

### 3.4 AI加工

1. `/api/polish` に `text` と `mode` を送る
2. Gemini APIで加工
3. 結果を画面に表示 or 保存/コピー

## 4. 鍵の考え方

- 共有ルームID（bucket_id）: 閲覧キー
- 編集キー（write_key）: 保存・削除のキー
- サーバに送るのは `write_key_hash`（平文は保存しない）

## 5. PWAの仕組み

- `manifest.webmanifest` でアプリ名・アイコンを登録
- `sw.js` がアプリシェルをキャッシュ
- APIレスポンスはキャッシュしない（常に最新）

## 6. 主要ファイル

- `src/components/PolishForm.tsx` 画面と主要ロジック
- `src/app/api/polish/route.ts` AI加工API
- `src/app/api/phrases/delete/route.ts` 削除API
- `src/app/api/phrases/cleanup/route.ts` 期限切れ/件数整理API
- `src/lib/supabaseClient.ts` クライアント側Supabase設定
- `src/lib/supabaseAdmin.ts` サーバ側Supabase設定
- `public/manifest.webmanifest` PWA設定
- `public/sw.js` Service Worker

## 7. 困ったとき

- 共有ルームIDを間違えると、一覧が空になります
- 編集キーが違うと、保存や削除ができません
- AIが失敗しても保存/コピーは通常どおり使えます
