"""
AI ニュースダイジェスト - RSS/RSSHubフィード取得モジュール
"""

import feedparser
import requests
from datetime import datetime, timezone, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Optional
import time

JST = timezone(timedelta(hours=9))

RSS_FEEDS = {
    "OpenAI": "https://openai.com/news/rss.xml",
    # Anthropic は公式RSSが廃止されたため Google News 経由
    "Anthropic": "https://news.google.com/rss/search?q=Anthropic+Claude+AI&hl=ja&gl=JP&ceid=JP:ja",
    "Zenn AI": "https://zenn.dev/topics/ai/feed",
}

RSS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

RSSHUB_ACCOUNTS = [
    # Claude Code / Cursor 関連
    "DeNAxAI_NEWS", "akihiro_genai", "gota_bara", "oikon48", "plant_ja",
    "seratch_ja", "tegnike", "gosrum", "kazuph", "commte", "yoshiko_pg",
    "kim_career_0621", "sakito", "yoppy0123", "tomohisa", "kinopee_ai",
    "ryu_f_web", "CaddiTech", "minorun365", "RiKobuki", "SS_chneider",
    # Codex / OpenAI 関連
    "talk_like_staw", "suna_gaku", "murasametech",
    # 生成AI・AIエージェント全般
    "akino_1027", "nuits_jp", "Mates_ENGINEER", "shoota", "kaz3284",
    "digi_kuma_", "suh_sunaneko", "MLBear2", "laiso", "HayattiQ",
    "ML_deep", "Emukei_", "mugu_KagawaAI", "kajikent", "robinebers",
    "cursorvers", "hiroki_daichi", "taziku_co", "Shimayus", "ai_database",
    "chankostin", "tkosht", "AravSrinivas", "mt_musyu", "yktyshr", "eiraces",
    # Dify / ノーコードAI関連
    "DifyJapan", "miyatti", "rik423__ai",
    # MCP・AI開発ツール関連
    "yoshimi0227_", "Keisuke69", "ryoppippi",
    # AI・個人開発
    "omotidaisukijp", "medmuspg", "natsumican63", "nukonuko",
    # 企業・組織アカウント（AI発信）
    "TimeeDev", "cloudpack_jp", "googlecloud_jp", "googlejapan",
    "gihyo_hansoku", "ADWAYS_ENGINEER", "DeNAPR", "findy_tools",
    # 海外AI情報
    "IndianTechGuide", "haydenbleasel", "mattshumer_",
    # AI/ML研究・学習・情報発信
    "NGO275", "Nozium1", "dai___you", "go__tanaka", "r_kawamata",
    "codenote_net", "kaonash_", "yuyhiraka", "u1", "iwamot",
    "yugen_matuni", "integrated1453", "flatt_security", "lmt_swallow",
    "dify_base", "isaoshimizu", "ayami_marketing", "gyakuse", "NotionHQ",
    "suthio_", "Sudachikawaii", "pkm_tk111", "snow_new_jp", "itchie_tatsumi",
    "OpenAIDevs", "Cursor", "arrakis_ai",
]

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; AINewsBot/1.0)"
}
TIMEOUT = 15


def parse_date(entry) -> Optional[datetime]:
    """エントリから公開日時を解析してUTC datetimeを返す"""
    for field in ("published_parsed", "updated_parsed"):
        val = getattr(entry, field, None)
        if val:
            try:
                return datetime(*val[:6], tzinfo=timezone.utc)
            except Exception:
                pass
    return None


def fetch_feed(name: str, url: str, extra_headers: dict = None) -> dict:
    """1つのRSSフィードを取得して結果を返す"""
    try:
        headers = dict(HEADERS)
        if extra_headers:
            headers.update(extra_headers)
        resp = requests.get(url, headers=headers, timeout=TIMEOUT)
        resp.raise_for_status()
        feed = feedparser.parse(resp.content)
        return {"name": name, "url": url, "entries": feed.entries, "error": None}
    except Exception as e:
        return {"name": name, "url": url, "entries": [], "error": str(e)}


def fetch_rsshub_feed(account: str) -> dict:
    """RSSHub経由でXアカウントのフィードを取得"""
    url = f"https://rsshub.app/twitter/user/{account}"
    return fetch_feed(f"@{account}", url)


def fetch_all_feeds(cutoff_hours: int = 24) -> dict:
    """
    全フィードを並行取得し、cutoff_hours以内の記事のみ返す

    Returns:
        {
            "rss": {"OpenAI": [...], "Anthropic": [...], "Zenn AI": [...]},
            "x": [{"account": ..., "title": ..., "link": ..., "date": ..., "summary": ...}],
            "stats": {"rss_errors": [...], "x_fetched": int, "x_failed": int}
        }
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=cutoff_hours)
    stats = {"rss_errors": [], "x_fetched": 0, "x_failed": 0}

    # RSS フィード取得
    rss_results = {}
    for name, url in RSS_FEEDS.items():
        # OpenAI はブラウザ風UAが必要
        extra = RSS_HEADERS if name == "OpenAI" else None
        result = fetch_feed(name, url, extra_headers=extra)
        if result["error"]:
            stats["rss_errors"].append(f"{name}: {result['error']}")
            rss_results[name] = []
        else:
            items = []
            seen_titles = set()
            for entry in result["entries"]:
                pub_date = parse_date(entry)
                if pub_date and pub_date >= cutoff:
                    title = getattr(entry, "title", "(タイトルなし)")
                    # ソース名を除いた本文タイトルを取得（Google News形式: "タイトル - ソース"）
                    clean_title = title.rsplit(" - ", 1)[0].strip()
                    # 重複タイトルをスキップ
                    if clean_title in seen_titles:
                        continue
                    seen_titles.add(clean_title)
                    # Google NewsのリンクからオリジナルURLを取得
                    link = getattr(entry, "link", "")
                    # feedparserのsourceリンクがあれば使用
                    source_url = ""
                    if hasattr(entry, "source") and hasattr(entry.source, "href"):
                        source_url = entry.source.href
                    items.append({
                        "title": clean_title,
                        "link": link,
                        "source_url": source_url,
                        "date": pub_date.astimezone(JST),
                        "summary": getattr(entry, "summary", ""),
                    })
            rss_results[name] = items

    # X (RSSHub) フィード取得 - 並行処理
    x_items_all = []
    with ThreadPoolExecutor(max_workers=20) as executor:
        futures = {executor.submit(fetch_rsshub_feed, acc): acc for acc in RSSHUB_ACCOUNTS}
        for future in as_completed(futures):
            result = future.result()
            if result["error"]:
                stats["x_failed"] += 1
            else:
                stats["x_fetched"] += 1
                account = result["name"]
                for entry in result["entries"]:
                    pub_date = parse_date(entry)
                    if pub_date and pub_date >= cutoff:
                        title = getattr(entry, "title", "")
                        link = getattr(entry, "link", "")
                        summary = getattr(entry, "summary", "")
                        x_items_all.append({
                            "account": account,
                            "title": title,
                            "link": link,
                            "date": pub_date.astimezone(JST),
                            "summary": summary,
                        })

    # 新しい順にソート
    x_items_all.sort(key=lambda x: x["date"], reverse=True)

    return {
        "rss": rss_results,
        "x_all": x_items_all,
        "stats": stats,
    }
