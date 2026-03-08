"""AnthropicブログのHTMLスクレイパー（RSSが404のため）"""
import requests
import re
from datetime import datetime, timezone, timedelta
from config import HOURS

URL = "https://www.anthropic.com/news"
TIMEOUT = 15
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)"}


def fetch_anthropic_news() -> list[dict]:
    """AnthropicニュースページをスクレイピングしてアイテムリストにしてReturnする"""
    try:
        resp = requests.get(URL, headers=HEADERS, timeout=TIMEOUT)
        resp.raise_for_status()
        return _parse_page(resp.text)
    except Exception as e:
        print(f"  [SKIP] Anthropic scraper: {e}")
        return []


def _parse_date(date_str: str) -> datetime | None:
    if not date_str:
        return None
    clean = date_str.strip().replace("Z", "+00:00")
    try:
        dt = datetime.fromisoformat(clean)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except ValueError:
        pass
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z",
                "%B %d, %Y", "%b %d, %Y"):
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.astimezone(timezone.utc)
        except ValueError:
            pass
    return None


def _parse_page(html: str) -> list[dict]:
    """HTMLからAnthropicの記事を抽出する。publishedOnが判明しているもののみ返す"""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=HOURS)
    # HTMLには \" エスケープが含まれているためアンエスケープ
    unescaped = html.replace('\\"', '"')

    items = []
    seen = set()
    idx = 0
    while True:
        idx = unescaped.find('"publishedOn":', idx)
        if idx == -1:
            break
        # publishedOn の値を取得
        pub_m = re.search(r'"publishedOn"\s*:\s*"([^"]+)"', unescaped[idx:idx + 100])
        if not pub_m:
            idx += 1
            continue
        pub_str = pub_m.group(1)
        pub = _parse_date(pub_str)

        # 周辺800文字でタイトルとslugを探す
        segment = unescaped[max(0, idx - 800):idx + 200]
        title_m = re.search(r'"title"\s*:\s*"([^"]{5,200})"', segment)
        slug_m = re.search(r'"current"\s*:\s*"([^"/]{3,100})"', segment)

        if title_m:
            title = title_m.group(1).strip()
            slug = slug_m.group(1).strip() if slug_m else ""
            key = (title, pub_str)
            if key not in seen and pub is not None and pub >= cutoff:
                seen.add(key)
                link = (
                    f"https://www.anthropic.com/news/{slug}"
                    if slug and "/" not in slug and "@" not in slug
                    else "https://www.anthropic.com/news"
                )
                items.append({
                    "title": title,
                    "link": link,
                    "summary": "",
                    "published": pub,
                    "source": "Anthropic",
                })
        idx += 1

    return items
