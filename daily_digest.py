"""
AI ニュース日報 - メインスクリプト
毎日実行してAIニュースを収集しSlack #times-oki に投稿する

必要な環境変数（Cursor Dashboard > Cloud Agents > Secrets で設定）:
  SLACK_BOT_TOKEN  : Slack Bot の OAuth Token (xoxb-...)
    または
  SLACK_WEBHOOK_URL: Slack Incoming Webhook URL

オプション環境変数（要約の品質向上に使用）:
  OPENAI_API_KEY   : OpenAI API Key（指定するとGPT-4o-miniで要約生成）
  ANTHROPIC_API_KEY: Anthropic API Key（指定するとClaudeで要約生成）
"""

import os
import sys
from fetch_feeds import fetch_all_feeds
from summarize import enrich_items
from format_message import build_slack_message
from post_to_slack import post_message, SLACK_BOT_TOKEN, SLACK_WEBHOOK_URL

CUTOFF_HOURS = int(os.environ.get("DIGEST_CUTOFF_HOURS", "24"))


def main():
    print("=== AI ニュース日報 開始 ===")

    # フィード取得
    print(f"フィードを取得中（過去{CUTOFF_HOURS}時間）...")
    data = fetch_all_feeds(cutoff_hours=CUTOFF_HOURS)
    stats = data.get("stats", {})
    print(f"  X: 成功={stats.get('x_fetched', 0)}, 失敗={stats.get('x_failed', 0)}")
    if stats.get("rss_errors"):
        for err in stats["rss_errors"]:
            print(f"  RSSエラー: {err}")

    for src, items in data["rss"].items():
        print(f"  {src}: {len(items)} 件")
    print(f"  X合計: {len(data.get('x_all', []))} 件")

    # 要約・選定
    print("要約・選定中...")
    data = enrich_items(data)
    print(f"  X選定: {len(data.get('x_top', []))} 件")

    # メッセージ組み立て
    message = build_slack_message(data)
    print("\n=== 投稿メッセージプレビュー ===")
    print(message)
    print("================================\n")

    # Slack投稿
    if not SLACK_BOT_TOKEN and not SLACK_WEBHOOK_URL:
        print("⚠️  SLACK_BOT_TOKEN も SLACK_WEBHOOK_URL も未設定です。")
        print("   Cursor Dashboard > Cloud Agents > Secrets で設定してください。")
        sys.exit(1)

    success = post_message(message)
    if success:
        print("✅ Slack投稿完了")
    else:
        print("❌ Slack投稿失敗")
        sys.exit(1)


if __name__ == "__main__":
    main()
