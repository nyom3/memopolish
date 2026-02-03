# 仕様（MemoPolish / PhraseBridge）

## 1. 概要

MemoPolish は、PC とスマホの間でフレーズを共有する PhraseBridge です。  
AI 推敲は任意機能で、通常の保存はAIなしで完結します。

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

- bucket_id: 閲覧キー（22文字以上）
- write_key: 保存・削除キー
- 同じ bucket_id で同期する場合は **同じ write_key** を使う
- write_key_hash は SHA-256 で生成し、平文はDBに保存しない

## 5. UI構成

1画面構成:

- 上部: フレーズ入力
- ボタン: 保存 / 推敲してコピー / 推敲して保存
- 中央: bucket_id 表示 + コピー / 手動入力
- Advanced: write_key 表示・コピー / 手動入力
- 下部: フレーズ一覧（コピー / 推敲 / 削除）

## 6. 主要フロー

### 6.1. 保存

- 入力バリデーション（2000文字以内）
- `bucket_id` と `write_key_hash` を付与して保存
- 期限は `created_at + 7日`
- 保存後に cleanup を実行

### 6.2. 取得

- `bucket_id` で最新順に取得
- `expires_at` が過去の行は非表示

### 6.3. 削除

- サーバAPIで `id + bucket_id + write_key_hash` を検証
- 一致しない場合は 403 / 不存在は 404

### 6.4. cleanup

1) expires_at が過去の行を削除  
2) created_at DESC で最新200件を残し、超過分を削除

## 7. API

- `POST /api/polish`（Gemini API）
- `POST /api/phrases/delete`（削除）
- `POST /api/phrases/cleanup`（200件整理）

## 8. 制約

- 認証なし（MVP）
- 複雑な状態管理は使わない
- モバイル対応

## 9. Definition of Done

- 同じ bucket_id で 2端末の同期が取れる
- 保存/削除が write_key で保護される
- 期限切れが表示されない
- 200件上限が維持される
- AI 推敲が任意で利用できる
