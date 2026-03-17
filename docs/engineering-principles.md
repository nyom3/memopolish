# Engineering Principles

## 目的

この文書は、AI と人間がこの repository で実装判断するときの共通原則をまとめる。
迷ったら「MVP の価値を壊さず、最小差分で、既存責務を守る」を優先する。

## 基本原則

- small diffs
  - 依頼範囲に必要な最小差分を優先する
  - 特に `src/components/PolishForm.tsx` では局所変更を基本とする
- no unrelated refactor
  - 依頼と無関係な整形、大規模分割、命名変更、責務再配置を同時に行わない
- follow existing patterns
  - 既存の App Router、API ルート、Supabase wrapper、`@/*` import を踏襲する
  - クライアント接続は `src/lib/supabaseClient.ts`、サーバ接続は `src/lib/supabaseAdmin.ts` を使う
- avoid speculative expansion
  - 将来必要そうという理由だけで機能、抽象化、設定項目を増やさない
  - 不明な仕様は `要確認` として止める
- clarify ambiguity
  - 文書や実装で根拠が取れない点は推測で埋めない
  - 制約変更がある場合は影響範囲を明示する
- preserve UI consistency
  - 1 画面完結、既存の操作導線、操作フィードバックを崩さない
  - AI 加工が失敗しても通常フローを壊さない
- verify build/type/lint where applicable
  - 変更後は可能な範囲で `npm run lint` と `npm run build` を確認する
  - 実接続確認できない場合は未確認事項として残す

## Architecture Stability

現在のアーキテクチャは MVP を優先した構成です。
大規模な構造変更は通常タスクでは行わないでください。

- 状態管理ライブラリの導入
- フォルダ構成の再設計
- 大きな UI 分割
- 中核責務の再配置

必要な場合は、別の設計タスクとして扱う。

## 責務分離

- `page.tsx` は薄く保つ
- UI は表示とユーザー操作を担う
- 外部 I/O、削除権限判定、cleanup、Gemini 呼び出しは API / lib 側で扱う
- `SUPABASE_SERVICE_ROLE_KEY` をクライアントに渡さない
- UI から Gemini を直接呼ばない

## データとセキュリティ

- `bucket_id` は共有キー
- `write_key` は保存・削除キー
- `write_key_hash` はサーバ送信用
- これらの役割を混ぜない
- 削除と cleanup の保護条件を緩めない
- `write_key` 平文を DB に保存しない

## AI 実装時の原則

- Gemini 呼び出しは `src/app/api/polish/route.ts` に集約する
- 入力長、mode、追加指示の検証を API 境界で維持する
- 出力ポリシーを弱めない
  - 事実追加禁止
  - 固有名詞、数値、日付の改変禁止
- AI 失敗時でも保存・共有導線は継続可能にする

## PWA とキャッシュ

- `public/manifest.webmanifest` と `public/sw.js` を前提にする
- API レスポンスをキャッシュしない
- PWA を触る変更ではホーム画面追加と起動確認まで考慮する

## ドキュメント運用

- 仕様変更時は `spec.md` を更新候補に入れる
- セットアップや環境変数変更時は `README.md` を更新候補に入れる
- 仕組み説明が変わる場合は `docs/app-overview.md` を更新候補に入れる
- ユーザー視点で意味がある変更は `CHANGELOG.md` を更新候補に入れる
- AI が毎回読みやすいよう、短く、判断に効く事実を優先する

## 実務上のチェック

- 変更前に影響ファイルを確認する
- 変更後に少なくとも対象導線の手動確認手順を示す
- `PolishForm.tsx` を触った場合は保存、一覧、削除、AI 加工を確認対象に入れる
- テストを追加しない場合は理由か未整備である旨を明記する
