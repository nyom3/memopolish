# AGENTS.md

## Project Overview
`memopolish` は、PC とスマホの間で短いフレーズを共有する `PhraseBridge` 系の Next.js アプリです。  
AI 加工は任意機能であり、主要価値は「認証なしでも軽く共有できること」と「保存・削除の最低限の保護があること」です。

この repo では、1画面で完結する使いやすさを優先します。  
一方で、UI に外部接続や権限判定を寄せすぎず、Supabase と Gemini API への接続は既存の分離パターンを維持します。

## Tech Stack
- Next.js 16 + App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase
- Gemini API (`@google/generative-ai`)
- PWA（`manifest.webmanifest` + `sw.js`）
- npm

## Directory Responsibilities
- `src/app`
  - App Router のページ、レイアウト、API ルートを置く
- `src/app/api`
  - サーバ側処理を置く
  - AI 加工、削除、cleanup など、秘密情報や検証が必要な処理はここで扱う
- `src/components`
  - UI コンポーネントを置く
  - 現状の主役は `PolishForm.tsx`
- `src/lib`
  - 外部接続の薄いラッパーを置く
  - `supabaseClient.ts` はクライアント用
  - `supabaseAdmin.ts` はサーバ用
- `public`
  - PWA 関連の静的ファイルを置く
- `docs`
  - 補助ドキュメントを置く
- ルート直下の `README.md` `spec.md` `tech-stack.md` `CHANGELOG.md`
  - この repo ではルート直下ドキュメントも運用対象

## External Integration Rules
### Supabase
- クライアント側では `src/lib/supabaseClient.ts` を使う
- サーバ側の削除・cleanup では `src/lib/supabaseAdmin.ts` を使う
- `SUPABASE_SERVICE_ROLE_KEY` はクライアントへ渡さない
- `page.tsx` や UI コンポーネントで直接 `createClient` しない

### Gemini API
- Gemini 呼び出しは `src/app/api/polish/route.ts` に集約する
- UI から直接 Gemini を呼ばない
- 入力制約、許可モード、エラーハンドリングは API 境界で維持する
- 事実追加禁止、固有名詞や数値の改変禁止など、この repo 固有の出力ポリシーを壊さない

### localStorage / ブラウザ API
- `bucket_id` と `write_key` の保持はクライアント側で行う
- `write_key` の平文は DB に保存しない
- サーバへ送る値は `write_key_hash` を使う

### PWA
- `public/manifest.webmanifest` と `public/sw.js` を前提にする
- API レスポンスをキャッシュする変更は慎重に扱う
- PWA 対応を壊す変更では、ホーム画面追加と起動確認まで行う

## Build / Lint / Test Commands
基本コマンド:

- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run start`

確認の優先順:
1. 変更箇所のローカル動作確認
2. `npm run lint`
3. `npm run build`

テストについて:
- 現時点で整備済みの自動テストはない
- 重要ロジックを触る場合は、最低限のテスト追加を検討する
- テストを追加しない場合は、手動確認内容を明記する

## Implementation Rules
- 既存の 1画面構成を前提にするが、画面に責務を詰め込みすぎない
- `src/app/page.tsx` は薄く保ち、主処理は `src/components/PolishForm.tsx` か API / lib 側に寄せる
- 外部 I/O、削除権限判定、cleanup、AI 呼び出しは UI へ直書きしない
- `@/*` エイリアスを使う
- TypeScript の型を維持する
- 既存の camelCase / PascalCase 命名を崩さない
- 入力上限、保存件数上限、有効期限などの既存制約を変更する場合は、影響を明示する

この repo で特に守ること:
- `bucket_id` は共有キー、`write_key` は編集キー、`write_key_hash` はサーバ送信用という役割を混ぜない
- 削除と cleanup の保護条件を緩めない
- AI 加工が失敗しても通常の保存・共有フローは壊さない
- `src/components/PolishForm.tsx` は 900 行超の中核ファイルとして扱う
- `src/components/PolishForm.tsx` への変更は局所的に行い、依頼範囲に必要な最小差分を優先する
- `src/components/PolishForm.tsx` を触る際に、関係のない整形や大規模リファクタを同時に行わない
- `src/components/PolishForm.tsx` の大規模分割や再構成は、通常の機能修正とは分けて別タスクで扱う

## Documentation Rules
最低限更新候補に含めるもの:

- `spec.md`
  - 仕様や制約を変えたとき
- `README.md`
  - セットアップ、環境変数、主要機能、確認手順を変えたとき
- `docs/app-overview.md`
  - データの流れや仕組み説明を変えたとき
- `tech-stack.md`
  - 技術構成を変えたとき
- `CHANGELOG.md`
  - ユーザー視点で意味のある変更を加えたとき

必要に応じて残す内容:
- 何を変えたか
- なぜ変えたか
- 何を確認したか
- 何が未確認か

書きすぎる必要はありません。  
未来の自分と AI が判断経緯を追える粒度を優先します。

## Manual Check Guidelines
変更後は、影響に応じて以下を確認します。

- フレーズ保存ができる
- 一覧取得ができる
- 削除ができる、または権限エラーが正しく出る
- AI 加工が各モードで動く
- エラー時に画面が壊れない
- PWA 関連を触った場合は、ホーム画面追加と起動確認を行う

`src/components/PolishForm.tsx` を変更した場合は、少なくとも保存、一覧、削除、AI 加工の主要導線を確認対象に含めます。

Supabase や Gemini の実接続確認ができない場合は、その旨を明記します。

## Repo-specific Risks or Forbidden Patterns
- UI で service role key 相当の処理を扱わない
- `src/components/PolishForm.tsx` にさらに外部接続やサーバ責務を追加しすぎない
- `write_key` の平文を DB 保存しない
- API ルートの入力検証を外さない
- AI プロンプトの安全制約を軽くしない
- `sw.js` の変更で API キャッシュを入れない

特に注意する変更:
- `bucket_id` / `write_key` / `write_key_hash` の仕様変更
- phrase 上限件数や有効期限の変更
- Supabase の権限まわり
- Gemini のプロンプト方針変更
- PWA キャッシュ戦略の変更

## Environment Variables
この repo で前提となる環境変数:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

新しい環境変数を追加する場合は、用途と参照場所を `README.md` に反映します。
