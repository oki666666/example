"""AIコンテンツスコアリングと要約生成"""

import re
from html import unescape


AI_KEYWORDS = [
    # 製品・ツール
    "gpt", "claude", "gemini", "cursor", "copilot", "chatgpt", "openai",
    "anthropic", "deepmind", "llm", "llms", "生成ai", "生成 ai",
    "大規模言語モデル", "言語モデル", "ai", "人工知能", "機械学習",
    # 技術
    "rag", "agent", "エージェント", "mcp", "prompt", "プロンプト",
    "ファインチューン", "fine-tun", "embedding", "ベクター",
    "transformer", "diffusion", "stable diffusion", "midjourney",
    # タスク・ユースケース
    "自動化", "automation", "コード生成", "code generation", "vibe coding",
    "dify", "n8n", "langchain", "langgraph",
    # リリース・アップデート
    "リリース", "release", "アップデート", "update", "発表", "announce",
    "新機能", "new feature", "バージョン", "version",
]


def clean_html(text: str) -> str:
    """HTMLタグを除去してテキストをクリーニング"""
    text = re.sub(r"<[^>]+>", " ", text)
    text = unescape(text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def score_ai_relevance(item: dict) -> float:
    """AIコンテンツの関連度スコアを計算（0.0〜1.0）"""
    text = (item.get("title", "") + " " + item.get("summary", "")).lower()
    text = clean_html(text)
    score = 0.0
    for kw in AI_KEYWORDS:
        if kw in text:
            score += 1.0
    # タイトルに含まれる場合は追加ボーナス
    title_lower = item.get("title", "").lower()
    for kw in AI_KEYWORDS:
        if kw in title_lower:
            score += 0.5
    return min(score / 5.0, 1.0)


def make_summary(item: dict, max_len: int = 120) -> str:
    """アイテムの1〜2文要約を生成"""
    raw = item.get("summary", "") or item.get("title", "")
    text = clean_html(raw)

    # 長すぎる場合は切り詰め
    if len(text) > max_len:
        text = text[:max_len].rsplit(" ", 1)[0] + "…"

    return text


def select_top_x_items(items: list[dict], max_items: int = 10) -> list[dict]:
    """Xポストから上位アイテムを選択（AIスコア順）"""
    scored = []
    for item in items:
        score = score_ai_relevance(item)
        scored.append((score, item))

    # スコア降順、同スコアは新しい順
    scored.sort(key=lambda x: (x[0], x[1].get("published") or 0), reverse=True)

    # スコア0のものは除外
    top = [item for score, item in scored if score > 0]

    # 1アカウント1件までに制限してバリエーションを確保
    seen_accounts = set()
    filtered = []
    for item in top:
        acc = item.get("account", "")
        if acc not in seen_accounts:
            seen_accounts.add(acc)
            filtered.append(item)
        if len(filtered) >= max_items:
            break

    # 足りない場合は重複アカウントも追加
    if len(filtered) < max_items:
        for item in top:
            if item not in filtered:
                filtered.append(item)
            if len(filtered) >= max_items:
                break

    return filtered[:max_items]
