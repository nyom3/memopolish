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
- Supabase の接続・権限境界に関する硬い条件は `docs/invariants.yml` を参照する
  <!-- invariant: SUPABASE_CLIENT_ADMIN_SEPARATION -->
  <!-- invariant: SERVICE_ROLE_KEY_SERVER_ONLY -->

### Gemini API
- Gemini API 境界と出力忠実性に関する硬い条件は `docs/invariants.yml` を参照する
  <!-- invariant: AI_API_BOUNDARY -->
  <!-- invariant: AI_OUTPUT_FIDELITY -->

### localStorage / ブラウザ API
- 鍵の役割と保存禁止条件は `docs/invariants.yml` を参照する
  <!-- invariant: KEY_ROLE_SEPARATION -->
  <!-- invariant: WRITE_KEY_NOT_IN_DB -->

### PWA
- `public/manifest.webmanifest` と `public/sw.js` を前提にする
- API キャッシュに関する硬い条件は `docs/invariants.yml` を参照する
  <!-- invariant: NO_SW_API_CACHE -->
- PWA 対応を壊す変更では、ホーム画面追加と起動確認まで行う

## Build / Lint / Test Commands
基本コマンド:

- `npm run dev`
- `npm test`
- `npm run build`
- `npm run lint`
- `npm run start`

確認の優先順:
1. 変更箇所のローカル動作確認
2. `npm test`（`test` script が存在し、変更内容に関連する場合）
3. `npm run lint`
4. `npm run build`

テストについて:
- 現時点では `npm test` で実行できる最小限の自動テストがある
- 重要ロジックを触る場合は、最低限のテスト追加を検討する
- pure logic、validation、helper、変換処理を触る変更では `npm test` を確認対象に含める
- テストを追加しない場合は、手動確認内容を明記する

## Implementation Rules
- 既存の 1画面構成を前提にするが、画面に責務を詰め込みすぎない
- `src/app/page.tsx` は薄く保ち、主処理は `src/components/PolishForm.tsx` か API / lib 側に寄せる
- 外部 I/O、削除権限判定、cleanup、AI 呼び出しは UI へ直書きしない
- `@/*` エイリアスを使う
- TypeScript の型を維持する
- 既存の camelCase / PascalCase 命名を崩さない
- 入力上限、保存件数上限、有効期限などの硬い制約は `docs/invariants.yml` を参照する
  <!-- invariant: LIMITS_STABILITY -->

この repo で特に守ること:
- 鍵の役割、削除・cleanup、AI 出力、PolishForm の局所変更に関する硬い条件は `docs/invariants.yml` を参照する
  <!-- invariant: KEY_ROLE_SEPARATION -->
  <!-- invariant: PROTECT_DELETE_CLEANUP -->
  <!-- invariant: AI_OUTPUT_FIDELITY -->
  <!-- invariant: CORE_LOCAL_CHANGE_ONLY -->
- AI 加工が失敗しても通常の保存・共有フローは壊さない
- `src/components/PolishForm.tsx` は 900 行超の中核ファイルとして扱う

## Documentation Rules
task 開始時は docs 全体を走査せず、最小限の文脈から開始します。

### Documentation reading order
まず読むもの:

- `docs/ai-context.md`
- `docs/engineering-principles.md`
- `docs/repo-map.md`

必要時のみ読むもの:

- `spec.md`
- `docs/app-overview.md`
- `README.md`
- `tech-stack.md`
- `how-to-work.md`
- `dev-instruction.md`

原則:
- まずこの repo の AGENTS.md を確認する
- task 開始時に docs 全体を最初から順に読まない
- 常読対象で足りる範囲から着手し、不足分だけを追加で読む
- exploratory なメモや補助資料は必要な task のときだけ参照する

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
- 硬い禁止条件は `docs/invariants.yml` を参照する
  <!-- invariant: SERVICE_ROLE_KEY_SERVER_ONLY -->
  <!-- invariant: WRITE_KEY_NOT_IN_DB -->
  <!-- invariant: AI_API_BOUNDARY -->
  <!-- invariant: AI_OUTPUT_FIDELITY -->
  <!-- invariant: NO_SW_API_CACHE -->
- `src/components/PolishForm.tsx` にさらに外部接続やサーバ責務を追加しすぎない

特に注意する変更:
- 注意対象と対応する正本 ID は `docs/invariants.yml` を参照する
  <!-- invariant: KEY_ROLE_SEPARATION -->
  <!-- invariant: LIMITS_STABILITY -->
  <!-- invariant: SERVICE_ROLE_KEY_SERVER_ONLY -->
  <!-- invariant: AI_OUTPUT_FIDELITY -->
  <!-- invariant: NO_SW_API_CACHE -->

## Review Setup

このリポジトリの Claude コードレビューの effort は `docs/review.yml` で管理する。

```yaml
effort: fast   # fast | standard
```

- `fast` — Claude がインラインで diff を読み判断（agent 不使用、~20-40k tokens）
- `standard` — 3 finder agents + verifier agents（~70-100k tokens）
- セキュリティ境界・認証・削除系の変更のみ bundled `/code-review`（thorough、~250k+）を使用

新しいリポジトリでこのレビューフローを使う場合は `docs/review.yml` を追加するだけでよい。
skill 本体は `E:\apps\.agents\skills\code-review\SKILL.md` にワークスペース共通で置いてある。

## PR Review Monitoring

この repo では、PR 作成後と push 更新後に Claude review の監視を行う。

- PR 作成直後にワークスペースの `.review-inbox`（`E:/apps/.review-inbox`）へ PR URL を書き込む
- GitHub コメントを 5 分おき・最大 8 回確認する（このポーリング中は `.review-inbox` を更新しない）
- `claude-review-lgtm` を検知 → 完了として終了
- `claude-review-pending` を検知 → 指摘に対応し `npm test` / `npm run lint` / `npm run build` を実行 → push → `.review-inbox` へ PR URL を再度書き込む → ポーリングを再開
- 最大回数に達した場合は、未完了として状況を報告する

`.review-inbox` はローカル連携用ファイルであり、git 管理に含めない。

## Environment Variables
この repo で前提となる環境変数:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

新しい環境変数を追加する場合は、用途と参照場所を `README.md` に反映します。
