"""AIニュース日報メインスクリプト"""
import sys
import os
from datetime import datetime, timezone, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from fetch_feeds import fetch_rss_feeds, fetch_x_feeds
from anthropic_scraper import fetch_anthropic_news
from summarize import select_top_x
from format_message import build_message
from slack_post import post_to_slack
from config import X_MAX, ZENN_MAX


def main():
    print("=== AI ニュース日報 ===")
    now = datetime.now(timezone(timedelta(hours=9)))
    print(f"実行時刻 (JST): {now.strftime('%Y/%m/%d %H:%M')}")
    print()

    # RSS フィード取得
    print("[1] RSSフィード取得中...")
    rss_data = fetch_rss_feeds()

    # Anthropic: RSSが失敗した場合はスクレイパーで補完
    if "Anthropic" not in rss_data:
        print("  Anthropic RSS失敗 → スクレイパーで試行...")
        anthropic_items = fetch_anthropic_news()
        if anthropic_items:
            rss_data["Anthropic"] = anthropic_items
            print(f"    -> スクレイパーで {len(anthropic_items)}件取得")
    print()

    # X フィード取得
    print("[2] X (RSSHub) フィード取得中...")
    x_all = fetch_x_feeds()
    x_top = select_top_x(x_all, X_MAX)
    print(f"  上位{len(x_top)}件を選択")
    print()

    # メッセージ組み立て
    print("[3] メッセージ組み立て中...")
    message = build_message(rss_data, x_top, zenn_max=ZENN_MAX)
    print()
    print("--- 生成されたメッセージ ---")
    print(message)
    print("----------------------------")
    print()

    # 出力ファイルに保存
    out_path = os.path.join(os.path.dirname(__file__), "output.txt")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(message)
    print(f"  メッセージを {out_path} に保存しました")

    # Slack投稿
    print("[4] Slack投稿中...")
    success = post_to_slack(message)
    if not success:
        print("  Slack投稿できませんでした（環境変数を確認してください）")
    print()
    print("=== 完了 ===")
    return message


if __name__ == "__main__":
    main()
