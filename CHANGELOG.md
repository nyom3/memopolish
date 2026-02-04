# CHANGELOG

## 2026-02-04

### Added
- 操作フィードバック（スピナー/トースト/未保存表示）
- 削除時のフェードアウト

### Changed
- 操作別に busy を分離し、不要なブロックを回避

## 2026-02-03

コミットメッセージ: Implement server-side phrase maintenance and refresh docs

### Added
- PhraseBridge 向けの UI（保存/推敲/一覧/削除/Advanced）
- bucket_id / write_key の同期フロー
- Supabase クライアントと管理クライアント
- delete / cleanup のサーバAPI

### Changed
- cleanup を expires_at 優先 → 200件上限維持に変更
- delete/cleanup のバリデーションとエラー表示を強化

### Fixed
- write_key 不一致による削除失敗の可視化
- cleanup の古いデータ整理ロジック


