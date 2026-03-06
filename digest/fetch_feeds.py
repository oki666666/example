"""RSS/RSSHubフィード取得モジュール"""

import feedparser
import requests
import concurrent.futures
from datetime import datetime, timezone, timedelta
from typing import Optional
import time


TIMEOUT = 15
HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AINewsDigest/1.0)"
}


def parse_date(entry) -> Optional[datetime]:
    """feedparserエントリから日時を取得してUTC datetimeを返す"""
    for attr in ("published_parsed", "updated_parsed"):
        t = getattr(entry, attr, None)
        if t:
            try:
                return datetime(*t[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return None


def fetch_rss(url: str, source_name: str) -> list[dict]:
    """単一RSSフィードを取得してアイテムのリストを返す"""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
        items = []
        for entry in feed.entries:
            items.append({
                "source": source_name,
                "title": getattr(entry, "title", ""),
                "link": getattr(entry, "link", ""),
                "summary": getattr(entry, "summary", "") or getattr(entry, "description", ""),
                "published": parse_date(entry),
            })
        return items
    except Exception as e:
        print(f"[WARN] フィード取得失敗 {source_name} ({url}): {e}")
        return []


def fetch_x_account(account: str) -> list[dict]:
    """RSSHub経由でXアカウントのフィードを取得"""
    from config import RSSHUB_BASE
    url = RSSHUB_BASE.format(account)
    try:
        resp = requests.get(url, headers=HEADERS, timeout=TIMEOUT, allow_redirects=True)
        # Google/404へのリダイレクトを検出
        if "google.com" in resp.url or resp.status_code in (301, 302, 404):
            return []
        resp.raise_for_status()
        feed = feedparser.parse(resp.text)
        if not feed.entries:
            return []
        items = []
        for entry in feed.entries:
            items.append({
                "source": f"@{account}",
                "title": getattr(entry, "title", ""),
                "link": getattr(entry, "link", ""),
                "summary": getattr(entry, "summary", "") or getattr(entry, "description", ""),
                "published": parse_date(entry),
                "account": account,
            })
        return items
    except Exception:
        return []


def fetch_all_x_accounts(accounts: list[str]) -> list[dict]:
    """全Xアカウントを並行取得"""
    all_items = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_x_account, acc): acc for acc in accounts}
        for future in concurrent.futures.as_completed(futures):
            items = future.result()
            all_items.extend(items)
    return all_items


def filter_recent(items: list[dict], hours: int = 24) -> list[dict]:
    """過去N時間以内のアイテムだけを返す"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    recent = []
    for item in items:
        pub = item.get("published")
        if pub is None or pub >= cutoff:
            recent.append(item)
    return recent
