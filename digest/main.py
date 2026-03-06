"""
AIニュースダイジェスト メインスクリプト
"""

import logging
import sys
import os
from datetime import datetime, timezone

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def run():
    from .config import RSS_FEEDS, get_x_feed_configs
    from .fetch_feeds import fetch_feeds_parallel, FeedItem
    from .summarize import filter_and_rank_x_posts
    from .format_message import build_slack_message
    from .slack_post import post_message_in_chunks

    logger.info("=== AIニュースダイジェスト 開始 ===")
    now = datetime.now(timezone.utc)
    logger.info(f"現在時刻 (UTC): {now.isoformat()}")

    # --- 1. RSS フィード取得 ---
    logger.info("RSSフィードを取得中...")
    rss_items = fetch_feeds_parallel(RSS_FEEDS, max_workers=5)

    openai_items = [i for i in rss_items if i.source_name == "OpenAI" and i.is_within_hours(24)]
    anthropic_items = [i for i in rss_items if i.source_name == "Anthropic" and i.is_within_hours(24)]
    zenn_items = [i for i in rss_items if i.source_name == "Zenn AI" and i.is_within_hours(24)]

    # Anthropic RSSが取得できなかった場合はスクレイパーで代替
    if not anthropic_items:
        logger.info("Anthropic RSSが空のためスクレイパーで取得中...")
        from .anthropic_scraper import fetch_anthropic_news
        anthropic_scraped = fetch_anthropic_news()
        anthropic_items = [i for i in anthropic_scraped if i.is_within_hours(24)]
        if anthropic_items:
            logger.info(f"Anthropicスクレイパーで{len(anthropic_items)}件取得")

    logger.info(f"OpenAI: {len(openai_items)}件 / Anthropic: {len(anthropic_items)}件 / Zenn: {len(zenn_items)}件")

    # --- 2. X (Twitter) フィード取得 ---
    logger.info("X (RSSHub) フィードを取得中...")
    x_configs = get_x_feed_configs()
    x_all_items = fetch_feeds_parallel(x_configs, max_workers=20)

    # 過去24時間でフィルタリング
    x_recent = [i for i in x_all_items if i.is_within_hours(24)]
    logger.info(f"X取得件数: {len(x_all_items)}件 → 24時間以内: {len(x_recent)}件")

    # スコアリングして上位10件を選択
    x_top = filter_and_rank_x_posts(x_recent, top_n=10)
    logger.info(f"X厳選: {len(x_top)}件")

    # --- 3. Slackメッセージを構築 ---
    message = build_slack_message(
        openai_items=openai_items,
        anthropic_items=anthropic_items,
        zenn_items=zenn_items,
        x_items=x_top,
    )

    logger.info("=== 生成されたメッセージ ===")
    print(message)
    logger.info("=== メッセージ終了 ===")

    # --- 4. Slack投稿 ---
    if os.environ.get("SLACK_BOT_TOKEN") or os.environ.get("SLACK_WEBHOOK_URL"):
        logger.info("Slackへ投稿中...")
        success = post_message_in_chunks(message)
        if success:
            logger.info("Slack投稿完了！")
        else:
            logger.error("Slack投稿に失敗しました")
            sys.exit(1)
    else:
        logger.warning("SLACK_BOT_TOKEN / SLACK_WEBHOOK_URL が未設定のため、Slack投稿をスキップします")
        logger.warning("Cursor Dashboard > Secrets に SLACK_BOT_TOKEN または SLACK_WEBHOOK_URL を追加してください")

    logger.info("=== AIニュースダイジェスト 完了 ===")


if __name__ == "__main__":
    run()
