# だいたいロマ子カウンター

「だいたいロマ子」を含むテキストを投稿してカウントするWebアプリケーションです。

## 機能

- **テキスト投稿**: 「だいたいロマ子」を含むテキストのみ保存
- **一覧表示**: 投稿されたテキストと投稿日時を新しい順に表示
- **カウント機能**: 同じテキストが投稿された場合はカウントを増加
- **ランキング**: カウント数順にランキング表示

## 技術スタック

### フロントエンド
- React 18
- TypeScript
- TailwindCSS
- Axios

### バックエンド
- Node.js
- Express
- SQLite
- TypeScript

## セットアップ

### 前提条件
- Node.js (v18以上推奨)
- npm

### インストール

1. リポジトリをクローン
```bash
git clone <repository-url>
cd daitan-romako-counter
```

2. 依存関係をインストール
```bash
npm run install:all
```

### 開発サーバー起動

全体を起動（フロントエンド・バックエンド同時）:
```bash
npm run dev
```

個別に起動:
```bash
# バックエンドのみ
npm run backend:dev

# フロントエンドのみ  
npm run frontend:dev
```

### アクセス
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:3001

## API エンドポイント

- `POST /api/entries` - テキスト投稿
- `GET /api/entries` - 全投稿取得
- `GET /api/ranking` - ランキング取得
- `GET /api/health` - ヘルスチェック

## プロジェクト構造

```
daitan-romako-counter/
├── backend/              # バックエンドAPI
│   ├── src/
│   │   ├── server.ts     # Express サーバー
│   │   ├── database.ts   # SQLite データベース操作
│   │   └── types.ts      # TypeScript型定義
│   ├── package.json
│   └── tsconfig.json
├── frontend/             # React フロントエンド
│   ├── src/
│   │   ├── components/   # React コンポーネント
│   │   ├── App.tsx       # メインアプリ
│   │   ├── api.ts        # API クライアント
│   │   └── types.ts      # TypeScript型定義
│   ├── public/
│   ├── package.json
│   └── tailwind.config.js
└── package.json          # ルート設定
```

## データベース

SQLiteを使用してデータを保存します。データベースファイルは `backend/database.sqlite` に自動作成されます。

### テーブル構造

```sql
-- ユーザーテーブル
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- エントリーテーブル
CREATE TABLE entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  text TEXT NOT NULL UNIQUE,
  count INTEGER DEFAULT 1,
  user_id TEXT,
  user_name TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);
```

## テスト

このプロジェクトには包括的なテストスイートが含まれています。

### バックエンドテスト

```bash
cd backend

# テスト実行
npm test

# ウォッチモードでテスト実行
npm run test:watch

# カバレッジ付きでテスト実行
npm run test:coverage
```

### フロントエンドテスト

```bash
cd frontend

# テスト実行
npm test

# カバレッジ付きでテスト実行
npm test -- --coverage
```

### テストファイル構成

```
backend/tests/
├── database.test.ts      # データベース操作のテスト
├── api.test.ts          # API エンドポイントのテスト
└── integration.test.ts  # 統合テスト

frontend/src/components/__tests__/
├── UserLogin.test.tsx   # ユーザーログインコンポーネントのテスト
├── EntryForm.test.tsx   # エントリーフォームコンポーネントのテスト
└── EntryList.test.tsx   # エントリーリストコンポーネントのテスト
```

### テスト内容

- **ユニットテスト**: 個別の関数・コンポーネントの動作テスト
- **APIテスト**: REST API エンドポイントの動作テスト
- **統合テスト**: アプリケーション全体のワークフローテスト
- **UIテスト**: React コンポーネントのレンダリング・操作テスト