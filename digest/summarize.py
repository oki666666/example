"""
AIニュースの要約・スコアリング処理
"""

import re
from .fetch_feeds import FeedItem

# AI関連キーワード（重要度順）
AI_KEYWORDS_HIGH = [
    "claude", "chatgpt", "gpt-4", "gpt-5", "gemini", "llm", "llms",
    "openai", "anthropic", "cursor", "copilot", "claude code", "codex",
    "mcp", "ai agent", "aiエージェント",
    "生成ai", "生成AI", "大規模言語モデル",
]

AI_KEYWORDS_MEDIUM = [
    "ai", "人工知能", "機械学習", "ディープラーニング", "deep learning",
    "model", "モデル", "fine-tuning", "ファインチューニング",
    "rag", "vector", "embedding", "inference",
    "dify", "n8n", "langchain", "llamaindex",
    "プロンプト", "prompt", "token", "トークン",
    "github copilot", "windsurf", "cline",
    "リリース", "release", "発表", "launch",
]

AI_KEYWORDS_LOW = [
    "tech", "テック", "開発", "developer", "エンジニア",
    "api", "sdk", "tool", "ツール", "automation", "自動化",
    "workflow", "ワークフロー",
]


def score_item(item: FeedItem) -> int:
    """AIニュース関連度スコアを計算（高いほど重要）"""
    score = 0
    text = (item.title + " " + item.summary).lower()

    for kw in AI_KEYWORDS_HIGH:
        if kw.lower() in text:
            score += 10

    for kw in AI_KEYWORDS_MEDIUM:
        if kw.lower() in text:
            score += 5

    for kw in AI_KEYWORDS_LOW:
        if kw.lower() in text:
            score += 2

    # リポスト/RTは優先度を下げる
    if item.title.startswith("RT @") or item.title.startswith("RT:"):
        score -= 5

    return score


def _clean_summary(title: str, summary: str) -> str:
    """サマリーテキストをクリーンアップする"""
    # タイトルと同じ文字列が先頭にある場合は除去
    if summary.startswith(title):
        summary = summary[len(title):].strip()

    # Zenn等のメタデータを除去（「公開日: ...」「著者: ...」「タグ: ...」など）
    meta_patterns = [
        r"公開日[:：]\s*\S+",
        r"著者[:：]\s*\S+",
        r"タグ[:：]\s*[^\s。]+",
        r"^\s*Tags?[:：].*?(?=\s[^\s])",
        r"Posted on\s+\S+",
        r"By\s+\w+\s+on\s+\S+",
    ]
    for pat in meta_patterns:
        summary = re.sub(pat, "", summary, flags=re.IGNORECASE).strip()

    # 連続する空白を1つに
    summary = re.sub(r"\s+", " ", summary).strip()

    return summary


def create_summary(item: FeedItem) -> str:
    """
    タイトル＋本文から1〜2文の日本語要約を生成（ルールベース）
    本文がある場合は最初の1〜2文を抽出する。
    """
    summary = _clean_summary(item.title, item.summary.strip())

    if not summary:
        return ""

    # 文を分割（。！？で区切り）
    sentences = re.split(r"(?<=[。！？])\s*", summary)
    sentences = [s.strip() for s in sentences if s.strip()]

    if not sentences:
        # 英文の場合
        sentences = re.split(r"(?<=[.!?])\s+", summary)
        sentences = [s.strip() for s in sentences if s.strip()]

    # 最大2文、合計200文字以内
    result = ""
    for sent in sentences[:2]:
        candidate = result + (" " if result else "") + sent
        if len(candidate) <= 200:
            result = candidate
        else:
            break

    result = result.strip()

    if not result and summary:
        result = summary[:150] + ("..." if len(summary) > 150 else "")

    return result


def filter_and_rank_x_posts(items: list[FeedItem], top_n: int = 10) -> list[FeedItem]:
    """
    Xポストをスコアリングして上位top_n件を返す
    """
    scored = [(score_item(item), item) for item in items]
    scored.sort(key=lambda x: (-x[0], -x[1].published.timestamp()))

    result = []
    seen_links = set()
    for score, item in scored:
        if item.link in seen_links:
            continue
        seen_links.add(item.link)
        result.append(item)
        if len(result) >= top_n:
            break

    return result
