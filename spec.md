# 仕様（MemoPolish / PhraseBridge）

## 1. 概要

MemoPolish は、PC とスマホの間でフレーズを共有する PhraseBridge です。  
AI 加工（推敲 / 敬語化 / 要点抽出）は任意機能で、通常の保存はAIなしで完結します。

## 2. 目的（MVP）

- Gmail 下書きより簡単にフレーズ共有できること
- 認証なしでも最低限の安全性を担保すること

## 3. データモデル（Supabase）

`phrases` テーブル:

| column         | type        | note |
|----------------|-------------|------|
| id             | uuid (PK)   | 行ID |
| bucket_id      | text        | 同期キー |
| text           | text        | フレーズ本文 |
| write_key_hash | text        | SHA-256 | 
| created_at     | timestamptz | 作成日時 |
| expires_at     | timestamptz | 期限（作成 + 7日） |

## 4. キーと同期の考え方

- 共有ルームID（内部名: bucket_id）: 閲覧キー（22文字以上）
- 編集キー（内部名: write_key）: 保存・削除キー
- 同じ bucket_id で同期する場合は **同じ write_key** を使う
- write_key_hash は SHA-256 で生成し、平文はDBに保存しない

## 5. UI構成

1画面構成:

- 上部: フレーズ入力
- ボタン: 保存 / AI加工してコピー / AI加工して保存
- AI加工モード: polish / keigo / keypoints のドロップダウン
- 中央: 共有ルームID 表示 + コピー / 手動入力
- 編集キー（詳細）: 編集キー 表示・コピー / 手動入力
- 下部: フレーズ一覧（コピー / AI加工 / 削除）

## 6. UI体験（操作フィードバック）

- 操作中は対象ボタンを `disabled` にし、スピナーと `opacity` で状態を示す
- トースト通知（成功/失敗）を右下に表示し 2〜3秒で消える
- 入力欄に「未保存 / 保存済み」を表示する
- 削除時は対象行をフェードアウトし、成功後にリストから除去する
- エラーはフォーム上部表示を主とし、トーストは補助とする

## 7. 主要フロー

### 7.1. 保存

- 入力バリデーション（2000文字以内）
- `bucket_id` と `write_key_hash` を付与して保存
- 期限は `created_at + 7日`
- 保存後に cleanup を実行

### 7.2. 取得

- `bucket_id` で最新順に取得
- `expires_at` が過去の行は非表示

### 7.3. 削除

- サーバAPIで `id + bucket_id + write_key_hash` を検証
- 一致しない場合は 403 / 不存在は 404

### 7.4. cleanup

1) expires_at が過去の行を削除  
2) created_at DESC で最新200件を残し、超過分を削除

## 8. API

- `POST /api/polish`（Gemini API）
  - request: `{ text, mode, extraInstruction? }`
  - mode: `polish | keigo | keypoints`
- `POST /api/phrases/delete`（削除）
- `POST /api/phrases/cleanup`（200件整理）

## 9. PWA

- `public/manifest.webmanifest` と `public/sw.js` を使用
- アプリシェルと静的アセットのみキャッシュ
- API レスポンスはキャッシュしない

## 10. 制約

- 認証なし（MVP）
- 複雑な状態管理は使わない
- モバイル対応

## 11. Definition of Done

- 同じ bucket_id で 2端末の同期が取れる
- 保存/削除が write_key で保護される
- 期限切れが表示されない
- 200件上限が維持される
- AI 加工が任意で利用できる
