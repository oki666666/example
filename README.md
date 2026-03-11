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

---

## connpass人気イベントお知らせBot

このリポジトリには、Slack通知用のconnpass Bot実装も含まれています。

- 実装ディレクトリ: `bot/`
- 仕様書: `spec_connpass_bot_mvp.md`
- 要件定義: `requirements_connpass_bot.md`
- 実装タスク: `tasklist_connpass_bot.md`

Botの実行手順は `bot/README.md` を参照してください。
