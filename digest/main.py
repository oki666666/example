"""AIニュースダイジェスト メインスクリプト"""

import sys
import os

# digestディレクトリをパスに追加
sys.path.insert(0, os.path.dirname(__file__))

from config import RSS_FEEDS, X_ACCOUNTS, ZENN_MAX_ITEMS, X_MAX_ITEMS, SLACK_CHANNEL
from fetch_feeds import fetch_rss, fetch_all_x_accounts, filter_recent
from anthropic_scraper import fetch_anthropic_news
from summarize import select_top_x_items
from format_message import build_slack_message
from slack_post import post_to_slack


def main():
    print("=== AI ニュースダイジェスト開始 ===")

    # 1. OpenAI RSS取得
    print("[1/4] OpenAI フィード取得中...")
    openai_items = fetch_rss(RSS_FEEDS["OpenAI"], "OpenAI")
    openai_items = filter_recent(openai_items, hours=24)
    print(f"  → {len(openai_items)} 件（24時間以内）")

    # 2. Anthropic取得（RSS試行、失敗時はスクレイパー）
    print("[2/4] Anthropic フィード取得中...")
    anthropic_items = fetch_rss(RSS_FEEDS["Anthropic"], "Anthropic")
    if not anthropic_items:
        print("  → RSS失敗、スクレイパーで代替取得...")
        anthropic_items = fetch_anthropic_news(hours=24)
    else:
        anthropic_items = filter_recent(anthropic_items, hours=24)
    print(f"  → {len(anthropic_items)} 件（24時間以内）")

    # 3. Zenn AI RSS取得
    print("[3/4] Zenn AI フィード取得中...")
    zenn_items = fetch_rss(RSS_FEEDS["Zenn AI"], "Zenn AI")
    zenn_items = filter_recent(zenn_items, hours=24)
    print(f"  → {len(zenn_items)} 件（24時間以内）")

    # 4. X アカウント並行取得
    print(f"[4/4] X アカウント {len(X_ACCOUNTS)} 件を並行取得中...")
    x_all = fetch_all_x_accounts(X_ACCOUNTS)
    x_recent = filter_recent(x_all, hours=24)
    x_top = select_top_x_items(x_recent, max_items=X_MAX_ITEMS)
    print(f"  → 取得: {len(x_all)} 件 / 24h以内: {len(x_recent)} 件 / 選抜: {len(x_top)} 件")

    # 5. Slackメッセージ構築
    print("[5/5] メッセージ構築・投稿...")
    message = build_slack_message(
        openai_items=openai_items,
        anthropic_items=anthropic_items,
        zenn_items=zenn_items[:ZENN_MAX_ITEMS],
        x_items=x_top,
    )

    print("\n--- 投稿メッセージ ---")
    print(message)
    print("--- ここまで ---\n")

    # 6. Slack投稿
    success = post_to_slack(message, channel=SLACK_CHANNEL)

    if success:
        print("=== 完了: Slack投稿成功 ===")
    else:
        print("=== Slack投稿失敗（output.txt に保存済み）===")

    return message


if __name__ == "__main__":
    main()
