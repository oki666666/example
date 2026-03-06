"""Anthropicニュースページスクレイパー（RSS代替）"""

import re
import html as html_module
import requests
from datetime import datetime, timezone, timedelta


HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AINewsDigest/1.0)"
}


def fetch_anthropic_news(hours: int = 24) -> list[dict]:
    """Anthropicニュースページをスクレイプして最近の記事を返す"""
    url = "https://www.anthropic.com/news"
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15)
        resp.raise_for_status()
        page_html = resp.text
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)

        # 各データソースからマップを作成
        date_map = _extract_dates_from_json(page_html)
        title_map = _extract_titles_from_li(page_html)
        summary_map = _extract_summaries_from_json(page_html)

        # フィーチャードグリッドからもタイトルを補完
        _enrich_featured_titles(page_html, title_map)

        # 24時間以内の記事をフィルタリングして並び替え
        items = []
        for slug, pub in sorted(date_map.items(), key=lambda x: x[1], reverse=True):
            if pub >= cutoff:
                title = title_map.get(slug, slug.replace("-", " ").title())
                title = html_module.unescape(title).strip()
                summary = summary_map.get(slug, "")
                items.append({
                    "source": "Anthropic",
                    "title": title[:200],
                    "link": f"https://www.anthropic.com/news/{slug}",
                    "summary": summary,
                    "published": pub,
                })

        return items[:10]

    except Exception as e:
        print(f"[WARN] Anthropicスクレイプ失敗: {e}")
        return []


def _extract_dates_from_json(page_html: str) -> dict:
    """JSON埋め込みデータから slug -> datetime のマップを作成"""
    block_pattern = re.compile(
        r'publishedOn\\\":\\\"([^\\]+)\\\".*?current\\\":\\\"([^\\\"]+)\\\"',
        re.DOTALL
    )
    seen = set()
    date_map = {}
    for m in block_pattern.finditer(page_html):
        pub_str = m.group(1)
        slug = m.group(2)
        if slug in seen:
            continue
        seen.add(slug)
        try:
            pub = datetime.fromisoformat(pub_str.replace("Z", "+00:00"))
            date_map[slug] = pub
        except ValueError:
            pass
    return date_map


def _extract_titles_from_li(page_html: str) -> dict:
    """<li>ブロックから slug -> title のマップを作成"""
    li_blocks = re.findall(r"<li>(.*?)</li>", page_html, re.DOTALL)
    title_map = {}
    for li in li_blocks:
        link_match = re.search(r'href=\"/news/([^\"]+)\"', li)
        if not link_match:
            continue
        slug = link_match.group(1)
        if slug in title_map:
            continue
        title_match = re.search(r'__title[^>]+>([^<]+)</span>', li)
        if title_match:
            title_map[slug] = title_match.group(1).strip()
    return title_map


def _enrich_featured_titles(page_html: str, title_map: dict):
    """フィーチャードグリッドの <h2> タグからタイトルを補完"""
    featured_pattern = re.compile(
        r'href=\"/news/([^\"]+)\"[^>]*>.*?<h2[^>]*>([^<]+)</h2>',
        re.DOTALL
    )
    for m in featured_pattern.finditer(page_html):
        slug = m.group(1)
        title = m.group(2).strip()
        if slug not in title_map and title:
            title_map[slug] = title


def _extract_summaries_from_json(page_html: str) -> dict:
    """JSON埋め込みデータから slug -> summary のマップを作成"""
    slug_pattern = re.compile(r'current\\\":\\\"([^\\\"]+)\\\"')
    summary_map = {}
    for m in slug_pattern.finditer(page_html):
        slug = m.group(1)
        if slug in summary_map:
            continue
        chunk = page_html[m.start():m.start() + 2000]
        sm = re.search(r'summary\\\":\\\"((?:[^\\]|\\.)+?)\\\"', chunk)
        if sm:
            summary = sm.group(1).replace("\\n", " ").replace('\\"', '"').strip()
            summary_map[slug] = summary[:200]
    return summary_map
