"""
RSS/RSSHubフィードの取得・パース処理
"""

import feedparser
import requests
import logging
from datetime import datetime, timezone, timedelta
from dataclasses import dataclass
from typing import Optional
import time

logger = logging.getLogger(__name__)

@dataclass
class FeedItem:
    title: str
    link: str
    summary: str
    published: datetime
    source_name: str
    author: str = ""

    def is_within_hours(self, hours: int = 24) -> bool:
        now = datetime.now(timezone.utc)
        cutoff = now - timedelta(hours=hours)
        return self.published >= cutoff


def _parse_date(entry) -> Optional[datetime]:
    """feedparserのエントリから日時を取得してUTC datetimeに変換"""
    # published_parsed or updated_parsed
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                dt = datetime(*t[:6], tzinfo=timezone.utc)
                return dt
            except Exception:
                pass
    return None


def fetch_feed(url: str, source_name: str, timeout: int = 15) -> list[FeedItem]:
    """単一URLからフィードを取得してFeedItemリストを返す"""
    headers = {
        "User-Agent": "Mozilla/5.0 (compatible; AINewsDigestBot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
    }
    try:
        resp = requests.get(url, headers=headers, timeout=timeout)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
    except Exception as e:
        logger.warning(f"フィード取得失敗 [{source_name}] {url}: {e}")
        return []

    items = []
    for entry in feed.entries:
        published = _parse_date(entry)
        if published is None:
            # 日時不明の場合は現在時刻扱い（スキップせず一応含める）
            published = datetime.now(timezone.utc)

        title = getattr(entry, "title", "")
        link = getattr(entry, "link", "")
        summary_raw = getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
        # HTMLタグを除去
        import re
        summary = re.sub(r"<[^>]+>", "", summary_raw).strip()
        summary = " ".join(summary.split())[:300]  # 300文字に制限

        author = getattr(entry, "author", "")

        if title and link:
            items.append(FeedItem(
                title=title,
                link=link,
                summary=summary,
                published=published,
                source_name=source_name,
                author=author,
            ))

    return items


def fetch_feeds_parallel(feed_configs: list[tuple[str, str]], max_workers: int = 10) -> list[FeedItem]:
    """複数フィードを並行取得"""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    all_items: list[FeedItem] = []

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        futures = {
            executor.submit(fetch_feed, url, name): (url, name)
            for url, name in feed_configs
        }
        for future in as_completed(futures):
            url, name = futures[future]
            try:
                items = future.result()
                all_items.extend(items)
                if items:
                    logger.info(f"取得成功 [{name}]: {len(items)}件")
            except Exception as e:
                logger.warning(f"並行取得エラー [{name}]: {e}")

    return all_items
