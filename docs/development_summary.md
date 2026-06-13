# Development Summary

## 2026-06-13 docs/invariants

### 変更

- `docs/invariants.yml` を追加し、repo 固有の硬い不変条件を正本化した。
- `docs/engineering-principles.md`、`docs/ai-context.md`、`AGENTS.md` の硬い不変条件本文を正本 ID 参照へ整理した。
- `docs/repo-map.md` に `docs/invariants.yml` を参照先として追加した。

### 確認

- `docs/invariants.yml` は必須フィールド `id`、`statement`、`severity`、`triggers` を各項目に持つ。
- 旧ファイル側に `<!-- invariant: ... -->` コメントを残し、正本 ID で双方向 grep できる形にした。
- アプリコード `src/` 配下は変更していない。
- 既存 Node 環境で `docs/invariants.yml` の必須フィールド、`severity`、`ref` アンカーなし、10 件の ID を機械検査した。
- `npx --yes js-yaml docs/invariants.yml` で YAML parse が通った。
- `npm run lint` が通った。
- `npm run build` が通った。

### 未確認

- 判定保留にした硬い不変条件はない。
