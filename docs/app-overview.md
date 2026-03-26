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
2. クライアントが anon key で、共有ルームIDと編集キー（ハッシュ）を付けて保存
3. サーバAPIで古いデータの整理を実行
4. 最新一覧を再取得して画面更新

### 3.2 取得

1. クライアントが anon key で共有ルームIDを付けて一覧を取得
2. 期限切れのデータは非表示

### 3.3 削除

1. サーバAPIに `id + bucket_id + write_key_hash` を送る
2. サーバ側で一致チェック
3. `SUPABASE_SERVICE_ROLE_KEY` を使う server-side client で削除
4. クライアントから Supabase へ直接 `delete` はしない

### 3.4 AI加工

1. `/api/polish` に `text` と `mode` を送る
2. Gemini APIで加工
3. 結果を画面に表示 or 保存/コピー

## 4. 鍵の考え方

- 共有ルームID（bucket_id）: 閲覧キー
- 編集キー（write_key）: 保存・削除のキー
- サーバに送るのは `write_key_hash`（平文は保存しない）

## 5. RLS の考え方

- `phrases` テーブルは RLS を有効化する
- `select` と `insert` は anon クライアントに必要最小限で許可する
- `update` は使わないため許可しない
- `delete` はクライアント直許可せず、削除と cleanup をサーバAPI + service role に集約する
- 認証なしのため、`bucket_id` の閲覧制御は RLS 単体ではなくアプリ側クエリ条件と運用で担保する

## 6. PWAの仕組み

- `manifest.webmanifest` でアプリ名・アイコンを登録
- `sw.js` は許可リスト方式で必要最小限の静的資産だけをキャッシュ
- HTML ナビゲーション、`/api/`、`/sw.js`、`/_next/data/` はキャッシュしない
- `/_next/static/` と manifest / icons を主なキャッシュ対象にする

## 7. 主要ファイル

- `src/components/PolishForm.tsx` 画面と主要ロジック
- `src/app/api/polish/route.ts` AI加工API
- `src/app/api/phrases/delete/route.ts` 削除API
- `src/app/api/phrases/cleanup/route.ts` 期限切れ/件数整理API
- `src/lib/supabaseClient.ts` クライアント側Supabase設定
- `src/lib/supabaseAdmin.ts` サーバ側Supabase設定
- `public/manifest.webmanifest` PWA設定
- `public/sw.js` Service Worker

## 8. 困ったとき

- 共有ルームIDを間違えると、一覧が空になります
- 編集キーが違うと、保存や削除ができません
- AIが失敗しても保存/コピーは通常どおり使えます
