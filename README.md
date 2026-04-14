# Todo アプリ

シンプルで使いやすいTodoアプリです。

## 機能

- ✅ タスクの追加・削除
- ✅ タスクの完了/未完了の切り替え
- ✅ フィルター機能（すべて/未完了/完了済み）
- ✅ ローカルストレージでデータ永続化
- ✅ レスポンシブデザイン

## 使い方

1. ブラウザで `index.html` を開く
2. 入力欄に新しいタスクを入力
3. 「追加」ボタンをクリック、またはEnterキーを押す
4. チェックボックスでタスクの完了/未完了を切り替え
5. 「削除」ボタンでタスクを削除

## ファイル構成

```
.
├── index.html   # メインHTMLファイル
├── style.css    # スタイルシート
├── script.js    # JavaScript機能
└── README.md    # このファイル
```

## 技術スタック

- HTML5
- CSS3
- JavaScript (ES6+)
- LocalStorage API

## 参考ドキュメント（Hermes Agent 運用設計）

- `docs/hermes-usecases-ja.md`  
  タスク管理・MTGリマインド・日時振り返りの具体ユースケース集
- `docs/hermes-workflow-design-ja.md`  
  運用ワークフロー、通知設計、段階導入ステップ
