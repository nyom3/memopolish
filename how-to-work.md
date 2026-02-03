# 開発手順（ローカル）

## 1. リポジトリの準備

```bash
git clone <REPOSITORY_URL>
cd memopolish
```

## 2. 依存関係のインストール

```bash
npm install
```

## 3. 環境変数（.env.local）

```bash
# クライアントから参照される
NEXT_PUBLIC_SUPABASE_URL=YOUR_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY

# サーバーのみで参照される（ブラウザに出さない）
SUPABASE_URL=YOUR_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY

# Gemini API
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

## 4. 開発サーバー

```bash
npm run dev
```

`http://localhost:3000` へアクセス。

## 5. 主な確認ポイント

- bucket_id / write_key の共有で同期できる
- 保存/削除が write_key で保護される
- cleanup が 200件上限を維持する
- 期限切れが削除される

## 6. コーディング規約

- TypeScript/JavaScript を優先
- 変数・関数は camelCase
- コンポーネントは PascalCase

## 7. 関連ドキュメント

- `spec.md`
- `dev-instruction.md`
- `tech-stack.md`
- `CHANGELOG.md`
