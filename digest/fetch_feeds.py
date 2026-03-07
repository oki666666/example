"""RSS/RSSHubフィードの取得モジュール"""
import feedparser
import requests
import concurrent.futures
from datetime import datetime, timezone, timedelta
from typing import Optional
from config import RSS_FEEDS, X_ACCOUNTS, RSSHUB_BASE, HOURS

TIMEOUT = 10
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)"}


def parse_feed(url: str, name: str = "") -> list[dict]:
    """フィードをパースしてアイテムリストを返す"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
        items = []
        for entry in feed.entries:
            item = {
                "title": entry.get("title", "").strip(),
                "link": entry.get("link", "").strip(),
                "summary": entry.get("summary", entry.get("description", "")).strip(),
                "published": _parse_date(entry),
                "source": name,
            }
            items.append(item)
        return items
    except Exception as e:
        print(f"  [SKIP] {name} ({url}): {e}")
        return []


def _parse_date(entry) -> Optional[datetime]:
    """エントリから公開日時をパースしてUTC datetimeを返す"""
    import time as time_mod
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                return datetime(*t[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    for attr in ("published", "updated"):
        s = getattr(entry, attr, "")
        if s:
            for fmt in ("%a, %d %b %Y %H:%M:%S %z", "%Y-%m-%dT%H:%M:%S%z",
                        "%Y-%m-%dT%H:%M:%SZ"):
                try:
                    dt = datetime.strptime(s, fmt)
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    return dt.astimezone(timezone.utc)
                except ValueError:
                    pass
    return None


def filter_recent(items: list[dict], hours: int = HOURS) -> list[dict]:
    """過去N時間以内のアイテムのみ返す"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    result = []
    for item in items:
        pub = item.get("published")
        if pub is None or pub >= cutoff:
            result.append(item)
    return result


def fetch_rss_feeds() -> dict[str, list[dict]]:
    """設定済みRSSフィードを全取得して最近のアイテムを返す"""
    results = {}
    for name, url in RSS_FEEDS.items():
        print(f"  取得中: {name}")
        items = parse_feed(url, name)
        recent = filter_recent(items)
        print(f"    -> {len(items)}件取得, 24h以内: {len(recent)}件")
        if recent:
            results[name] = recent
    return results


def _fetch_x_account(account: str) -> list[dict]:
    """単一Xアカウントのフィードを取得"""
    url = RSSHUB_BASE.format(account)
    return parse_feed(url, f"@{account}")


def fetch_x_feeds() -> list[dict]:
    """全XアカウントのフィードをRSSHub経由で並行取得"""
    all_items = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(_fetch_x_account, acc): acc for acc in X_ACCOUNTS}
        for future in concurrent.futures.as_completed(futures):
            items = future.result()
            all_items.extend(filter_recent(items))
    print(f"  X: 24h以内のアイテム合計 {len(all_items)}件")
    return all_items
