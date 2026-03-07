"""AI関連スコアリングと要約生成"""
import re
from html import unescape
from config import X_MAX

AI_KEYWORDS = [
    "ai", "llm", "gpt", "claude", "gemini", "cursor", "copilot", "agent",
    "openai", "anthropic", "deepseek", "mistral", "llama", "mcp",
    "機械学習", "人工知能", "生成ai", "生成AI", "チャットgpt", "チャットGPT",
    "モデル", "プロンプト", "コーディング", "自動化", "rag", "RAG",
    "dify", "langchain", "embedding", "fine-tuning", "transformer",
    "midjourney", "stable diffusion", "imagen", "sora", "vibe coding",
    "codex", "github copilot", "bolt", "v0", "lovable", "replit",
]


def ai_score(item: dict) -> int:
    """AIトピック関連度スコアを返す（高いほど関連度高）"""
    text = (item.get("title", "") + " " + item.get("summary", "")).lower()
    text = unescape(text)
    score = 0
    for kw in AI_KEYWORDS:
        if kw.lower() in text:
            score += 2 if len(kw) > 5 else 1
    # リポストより独自コンテンツを優先（RTは減点）
    if "rt @" in text or text.startswith("rt "):
        score -= 3
    return score


def select_top_x(items: list[dict], n: int = X_MAX) -> list[dict]:
    """XアイテムからAI関連上位n件を選択"""
    scored = sorted(items, key=ai_score, reverse=True)
    seen_links = set()
    result = []
    for item in scored:
        link = item.get("link", "")
        if link in seen_links:
            continue
        seen_links.add(link)
        result.append(item)
        if len(result) >= n:
            break
    return result


def clean_text(text: str) -> str:
    """HTMLタグ・余分な空白を除去"""
    text = unescape(text)
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def make_summary(item: dict, max_chars: int = 150) -> str:
    """アイテムの1〜2文要約を生成"""
    summary = clean_text(item.get("summary", ""))
    title = clean_text(item.get("title", ""))

    if not summary or summary == title:
        return _truncate(title, max_chars)

    # URLをプレースホルダーに置換
    url_pattern = re.compile(r'https?://\S+')
    temp = url_pattern.sub("", summary).strip()

    if not temp:
        return _truncate(title, max_chars)

    # 日本語テキスト（。を含む）の場合
    if "。" in temp or "！" in temp or "？" in temp:
        sentences = re.split(r"[。！？]", temp)
        sentences = [s.strip() for s in sentences if len(s.strip()) > 3]
        if sentences:
            result = sentences[0]
            if len(result) < 30 and len(sentences) > 1:
                result = result + "。" + sentences[1]
            if result and not result.endswith(("。", "！", "？")):
                result += "。"
            return _truncate(result, max_chars)

    # 英語テキスト: 最初の1文を取得
    # バージョン番号(x.y)やURLを保護してから分割
    protected = re.sub(r'(\d+\.\d+)', lambda m: m.group().replace('.', '__DOT__'), temp)
    sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', protected)
    if sentences:
        result = sentences[0].replace('__DOT__', '.')
        return _truncate(result, max_chars)

    return _truncate(temp, max_chars)


def _truncate(text: str, max_chars: int) -> str:
    """単語境界でテキストを切り詰める"""
    if len(text) <= max_chars:
        return text
    truncated = text[:max_chars]
    last_space = truncated.rfind(" ")
    if last_space > max_chars // 2:
        return truncated[:last_space] + "…"
    return truncated + "…"
