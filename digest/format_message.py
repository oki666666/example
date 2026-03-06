"""Slackメッセージフォーマット生成"""

from datetime import datetime, timezone, timedelta
from summarize import make_summary, clean_html


JST = timezone(timedelta(hours=9))

WEEKDAY_JA = ["月", "火", "水", "木", "金", "土", "日"]

DIVIDER = "━━━━━━━━━━━━━━━━━━━"


def get_jst_now() -> datetime:
    return datetime.now(JST)


def format_date_header() -> str:
    now = get_jst_now()
    wd = WEEKDAY_JA[now.weekday()]
    return f":robot_face: *AI ニュース日報* — {now.year}/{now.month:02d}/{now.day:02d}（{wd}）"


def format_section(source_name: str, items: list[dict], max_items: int = 5) -> str:
    """特定ソースのセクションを生成"""
    if not items:
        return ""

    emoji_map = {
        "OpenAI": ":pushpin:",
        "Anthropic": ":pushpin:",
        "Zenn AI": ":pushpin:",
    }
    emoji = emoji_map.get(source_name, ":pushpin:")
    lines = [f"{emoji} *{source_name}*"]

    for item in items[:max_items]:
        title = item.get("title", "タイトル不明")
        link = item.get("link", "")
        summary = make_summary(item)
        if summary and summary != title:
            lines.append(f"• {title}\n  {summary}\n  :link: {link}")
        else:
            lines.append(f"• {title}\n  :link: {link}")

    return "\n".join(lines)


def format_x_section(items: list[dict]) -> str:
    """Xタイムラインセクションを生成"""
    if not items:
        return ""

    lines = [":bird: *X タイムライン注目ポスト*（最大10件）"]
    for item in items:
        account = item.get("account", "unknown")
        title = item.get("title", "")
        summary = make_summary(item, max_len=100)
        link = item.get("link", "")
        content = summary if summary and len(summary) > 10 else clean_html(title)
        if len(content) > 100:
            content = content[:100] + "…"
        lines.append(f"• @{account}: {content}\n  :link: {link}")

    return "\n".join(lines)


def build_slack_message(
    openai_items: list[dict],
    anthropic_items: list[dict],
    zenn_items: list[dict],
    x_items: list[dict],
) -> str:
    """全セクションを結合してSlackメッセージを構築"""
    parts = [format_date_header(), ""]

    sections = []

    openai_section = format_section("OpenAI", openai_items)
    if openai_section:
        sections.append(openai_section)

    anthropic_section = format_section("Anthropic", anthropic_items)
    if anthropic_section:
        sections.append(anthropic_section)

    zenn_section = format_section("Zenn AI", zenn_items, max_items=3)
    if zenn_section:
        sections.append(zenn_section)

    x_section = format_x_section(x_items)
    if x_section:
        sections.append(x_section)

    if not sections:
        return "本日はAIニュースはありませんでした :sunrise:"

    for section in sections:
        parts.append(DIVIDER)
        parts.append("")
        parts.append(section)
        parts.append("")

    parts.append(DIVIDER)
    parts.append("_本日のAIニュースは以上です :coffee:_")

    return "\n".join(parts)
