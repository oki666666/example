# FocusBoard

締切付きタスクのリスクを可視化する、個人向けタスク管理Webアプリです。  
3回の改善ループ（MVP→運用効率→信頼性/UX）で段階的に完成させています。

## 主な機能
- タスクCRUD（タイトル/メモ/優先度/期限）
- ステータス管理（未着手/進行中/完了）
- フィルタ（全件/未着手/進行中/完了/期限切れ）
- KPI表示（未完了/本日期限/期限切れ）
- 検索/ソート（作成日、期限、優先度）
- 一括完了/一括アーカイブ
- 削除Undo（復元）
- JSONエクスポート
- キーボードショートカット
  - `/` : 検索へフォーカス
  - `Alt + N` : 新規タスクタイトルへフォーカス

## 技術スタック
- フロントエンド: React + TypeScript + Vite
- バックエンド: Express + TypeScript
- DB: SQLite + Prisma
- バリデーション: Zod
- テスト: Vitest + Supertest + Testing Library

## セットアップ

```bash
npm install
npm run db:migrate
```

## 起動

### バックエンド
```bash
npm run dev:server
```
`http://localhost:8787`

### フロントエンド
```bash
npm run dev:web
```
`http://localhost:5173`

### 同時起動
```bash
npm run dev
```

## テスト

```bash
npm test
```

## ビルド

```bash
npm run build
```

## ドキュメント
- 反復記録:
  - `docs/iterations/loop1.md`
  - `docs/iterations/loop2.md`
  - `docs/iterations/loop3.md`
- 最終まとめ:
  - `docs/final-summary.md`
