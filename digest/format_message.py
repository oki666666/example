"""
Slackメッセージのフォーマット処理
"""

from datetime import datetime, timezone, timedelta
from .fetch_feeds import FeedItem
from .summarize import create_summary

WEEKDAYS_JA = ["月", "火", "水", "木", "金", "土", "日"]
SEPARATOR = "━━━━━━━━━━━━━━━━━━━"


def format_date_header() -> str:
    """今日の日付ヘッダーを生成（JST）"""
    jst = timezone(timedelta(hours=9))
    now = datetime.now(jst)
    weekday = WEEKDAYS_JA[now.weekday()]
    return f"🤖 *AI ニュース日報* — {now.strftime('%Y/%m/%d')}（{weekday}）"


def format_item(item: FeedItem, show_author: bool = False) -> str:
    """単一アイテムのフォーマット"""
    summary = create_summary(item)
    author_prefix = f"@{item.author}: " if show_author and item.author else ""

    lines = [f"• {author_prefix}{item.title}"]
    if summary and summary != item.title:
        lines.append(f"  {summary}")
    lines.append(f"  🔗 {item.link}")

    return "\n".join(lines)


def format_x_item(item: FeedItem) -> str:
    """Xポストのフォーマット"""
    summary = create_summary(item)
    author = item.author or item.source_name

    lines = [f"• @{author}: {summary}"]
    lines.append(f"  🔗 {item.link}")

    return "\n".join(lines)


def build_slack_message(
    openai_items: list[FeedItem],
    anthropic_items: list[FeedItem],
    zenn_items: list[FeedItem],
    x_items: list[FeedItem],
) -> str:
    """
    全セクションを組み合わせてSlackメッセージを構築する
    """
    parts = [format_date_header(), ""]
    has_any = False

    # OpenAI セクション
    if openai_items:
        has_any = True
        parts.append(SEPARATOR)
        parts.append("")
        parts.append("📌 *OpenAI*")
        for item in openai_items:
            parts.append(format_item(item))
        parts.append("")

    # Anthropic セクション
    if anthropic_items:
        has_any = True
        parts.append(SEPARATOR)
        parts.append("")
        parts.append("📌 *Anthropic*")
        for item in anthropic_items:
            parts.append(format_item(item))
        parts.append("")

    # Zenn AI セクション（最大3件）
    if zenn_items:
        has_any = True
        parts.append(SEPARATOR)
        parts.append("")
        parts.append("📌 *Zenn AI*")
        for item in zenn_items[:3]:
            parts.append(format_item(item))
        parts.append("")

    # X タイムライン セクション（最大10件）
    if x_items:
        has_any = True
        parts.append(SEPARATOR)
        parts.append("")
        parts.append("🐦 *X タイムライン注目ポスト*（最大10件）")
        for item in x_items[:10]:
            parts.append(format_x_item(item))
        parts.append("")

    if not has_any:
        parts.append("本日はAIニュースはありませんでした 🌅")
        return "\n".join(parts)

    parts.append(SEPARATOR)
    parts.append("_本日のAIニュースは以上です ☕_")

    return "\n".join(parts)
