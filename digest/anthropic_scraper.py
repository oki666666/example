"""
Anthropic ニュースページのスクレイパー
（公式RSSフィードが利用できない場合の代替手段）
"""

import re
import logging
import requests
from datetime import datetime, timezone
from typing import Optional
from .fetch_feeds import FeedItem

logger = logging.getLogger(__name__)

ANTHROPIC_NEWS_URL = "https://www.anthropic.com/news"
ANTHROPIC_BASE_URL = "https://www.anthropic.com"

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def _parse_published_on(date_str: str) -> Optional[datetime]:
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except Exception:
        return None


def fetch_anthropic_news(timeout: int = 20) -> list[FeedItem]:
    """
    Anthropicニュースページをスクレイピングして記事リストを返す。
    Next.jsのフライトデータから投稿エントリを抽出する。
    """
    try:
        resp = requests.get(ANTHROPIC_NEWS_URL, headers=_HEADERS, timeout=timeout)
        resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Anthropicページ取得失敗: {e}")
        return []

    html = resp.text

    items = []
    seen_slugs: set[str] = set()

    # Next.js フライトデータ内のデータは `\"key\":\"value\"` の形式でエスケープされている
    # "_type":"post" ブロックを分割して解析する
    # 実際のHTMLでは \\"_type\\":\\"post\\" の形式
    sections = re.split(r'\\"_type\\":\\"post\\"', html)

    pub_pattern = re.compile(r'\\"publishedOn\\":\\"([^"\\\\]+)')
    slug_pattern = re.compile(r'\\"current\\":\\"([a-z0-9-]+)\\"')
    title_pattern = re.compile(r'\\"title\\":\\"([^"\\\\]+)\\"')
    summary_pattern = re.compile(r'\\"summary\\":\\"([^"\\\\]+)\\"')

    for section in sections[1:]:
        # 次の post エントリまで切り取る
        next_post = section.find('\\"_type\\":\\"post\\"')
        chunk = section[:next_post] if next_post > 0 else section[:4000]

        pub_match = pub_pattern.search(chunk)
        slug_match = slug_pattern.search(chunk)
        title_match = title_pattern.search(chunk)

        if not (pub_match and slug_match and title_match):
            continue

        date_str = pub_match.group(1)
        slug = slug_match.group(1)
        title = title_match.group(1)

        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        published = _parse_published_on(date_str)
        if published is None:
            continue

        summary_match = summary_pattern.search(chunk)
        summary = summary_match.group(1) if summary_match else ""

        link = f"{ANTHROPIC_BASE_URL}/news/{slug}"

        items.append(FeedItem(
            title=title,
            link=link,
            summary=summary,
            published=published,
            source_name="Anthropic",
        ))

    logger.info(f"Anthropicスクレイパー: {len(items)}件取得")
    return items
