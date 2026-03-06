"""
AI ニュースダイジェスト - Slackメッセージフォーマットモジュール
"""

from datetime import datetime, timezone, timedelta

JST = timezone(timedelta(hours=9))

WEEKDAYS_JA = ["月", "火", "水", "木", "金", "土", "日"]

DIVIDER = "━━━━━━━━━━━━━━━━━━━"

SOURCE_ICONS = {
    "OpenAI": "📌",
    "Anthropic": "📌",
    "Zenn AI": "📌",
}


def format_date_header(dt: datetime) -> str:
    """日付ヘッダーを日本語フォーマットで生成"""
    weekday = WEEKDAYS_JA[dt.weekday()]
    return dt.strftime(f"%Y/%m/%d（{weekday}）")


MAX_ITEMS_PER_SOURCE = {
    "OpenAI": 5,
    "Anthropic": 5,
    "Zenn AI": 3,
}


def format_rss_section(source_name: str, items: list) -> str:
    """RSS記事セクションのフォーマット"""
    if not items:
        return ""

    icon = SOURCE_ICONS.get(source_name, "📌")
    lines = [f"{icon} *{source_name}*"]

    max_items = MAX_ITEMS_PER_SOURCE.get(source_name, 5)
    display_items = items[:max_items]

    for item in display_items:
        title = item.get("title", "(タイトルなし)")
        summary = item.get("summary_ja", "")
        link = item.get("link", "")

        lines.append(f"• {title}")
        # タイトルと同じ要約は表示しない
        if summary and summary.strip() != title.strip():
            lines.append(f"  {summary}")
        if link:
            lines.append(f"  🔗 {link}")

    return "\n".join(lines)


def format_x_section(x_items: list) -> str:
    """X投稿セクションのフォーマット"""
    if not x_items:
        return ""

    lines = [f"🐦 *X タイムライン注目ポスト*（最大10件）"]

    for item in x_items:
        account = item.get("account", "@unknown")
        summary = item.get("summary_ja", item.get("title", ""))
        link = item.get("link", "")

        # X投稿のURLをx.comに正規化
        if link and "twitter.com" in link:
            link = link.replace("twitter.com", "x.com")

        lines.append(f"• {account}: {summary}")
        if link:
            lines.append(f"  🔗 {link}")

    return "\n".join(lines)


def build_slack_message(data: dict) -> str:
    """
    全データからSlackメッセージを組み立てる

    Args:
        data: enrich_items()の返り値

    Returns:
        Slackに投稿するメッセージ文字列
    """
    now = datetime.now(JST)
    date_str = format_date_header(now)

    header = f"🤖 *AI ニュース日報* — {date_str}"

    sections = [header, DIVIDER]

    # RSS セクション（OpenAI, Anthropic, Zenn AI）
    rss_data = data.get("rss", {})
    rss_section_added = False
    for source_name in ["OpenAI", "Anthropic", "Zenn AI"]:
        items = rss_data.get(source_name, [])
        section = format_rss_section(source_name, items)
        if section:
            sections.append(section)
            sections.append(DIVIDER)
            rss_section_added = True

    # X セクション
    x_items = data.get("x_top", [])
    x_section = format_x_section(x_items)
    if x_section:
        sections.append(x_section)
        sections.append(DIVIDER)

    # 何もニュースがない場合
    if not rss_section_added and not x_items:
        return "本日はAIニュースはありませんでした 🌅"

    sections.append("_本日のAIニュースは以上です ☕_")

    return "\n".join(sections)
