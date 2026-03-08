"""Slackメッセージのフォーマット生成"""
from datetime import datetime, timezone, timedelta
from summarize import make_summary

JST = timezone(timedelta(hours=9))
WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"]


def format_date() -> str:
    now = datetime.now(JST)
    w = WEEKDAY_JA[now.weekday()]
    return f"{now.year}/{now.month:02d}/{now.day:02d}（{w}）"


def format_rss_section(name: str, items: list[dict], max_items: int = 5) -> str:
    if not items:
        return ""
    icon = "📌"
    lines = [f"{icon} *{name}*"]
    for item in items[:max_items]:
        title = item.get("title", "(タイトルなし)")
        link = item.get("link", "")
        summary = make_summary(item)
        lines.append(f"• {title}")
        if summary and summary != title:
            lines.append(f"  {summary}")
        if link:
            lines.append(f"  🔗 {link}")
    return "\n".join(lines)


def format_x_section(items: list[dict]) -> str:
    if not items:
        return ""
    lines = ["🐦 *X タイムライン注目ポスト*（最大10件）"]
    for item in items:
        source = item.get("source", "")
        account = source.lstrip("@") if source.startswith("@") else source
        title = item.get("title", "")
        link = item.get("link", "")
        summary = make_summary(item)
        desc = summary if summary and summary != title else title[:100]
        lines.append(f"• @{account}: {desc}")
        if link:
            lines.append(f"  🔗 {link}")
    return "\n".join(lines)


def build_message(
    rss_data: dict[str, list[dict]],
    x_items: list[dict],
    zenn_max: int = 3,
) -> str:
    sep = "━━━━━━━━━━━━━━━━━━━"
    date_str = format_date()
    sections = [f"🤖 *AI ニュース日報* — {date_str}", sep]

    has_content = False

    # OpenAI / Anthropic セクション
    for name in ("OpenAI", "Anthropic"):
        items = rss_data.get(name, [])
        if items:
            sections.append(format_rss_section(name, items))
            sections.append(sep)
            has_content = True

    # Zenn AIセクション（最大3件）
    zenn_items = rss_data.get("Zenn AI", [])
    if zenn_items:
        sections.append(format_rss_section("Zenn AI", zenn_items, max_items=zenn_max))
        sections.append(sep)
        has_content = True

    # X タイムラインセクション
    if x_items:
        sections.append(format_x_section(x_items))
        sections.append(sep)
        has_content = True

    if not has_content:
        return "本日はAIニュースはありませんでした 🌅"

    sections.append("_本日のAIニュースは以上です ☕_")
    return "\n".join(sections)
