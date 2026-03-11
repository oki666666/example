# connpass人気イベントお知らせBot

connpassイベントを取得し、以下条件に一致する開催前イベントをSlackへ通知するBotです。

- エンジニアリング系イベント
- 参加者数300人以上
- 開催前

## 実行方法

```bash
cd bot
npm ci
npm run connpass:notify
```

## 環境変数

- `SLACK_WEBHOOK_URL` (必須, `DRY_RUN` が false の場合)
- `SLACK_CHANNEL` (任意, デフォルト `#times-oki`)
- `MIN_ACCEPTED` (任意, デフォルト `300`)
- `CONNPASS_MAX_PAGES` (任意, デフォルト `20`)
- `CONNPASS_COUNT_PER_PAGE` (任意, デフォルト `100`)
- `DRY_RUN` (任意, `true`/`1` ならSlack送信せず標準出力のみ)

## GitHub Actions

`.github/workflows/connpass-popular-events-bot.yml` で以下を提供します。

- 定期実行: 毎週水曜 10:00 JST
- 手動実行: workflow_dispatch

### 必要なGitHub Secrets

- `SLACK_WEBHOOK_URL`
