"""
AI ニュースダイジェスト - 記事要約・選定モジュール
"""

import os
import re
import json
import requests
from typing import List, Optional

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")

AI_KEYWORDS = [
    "ai", "gpt", "llm", "claude", "gemini", "cursor", "copilot", "mcp",
    "openai", "anthropic", "deepseek", "agent", "chatgpt", "midjourney",
    "stable diffusion", "dify", "langchain", "rag", "fine-tun", "embedding",
    "transformer", "diffusion", "生成ai", "人工知能", "機械学習", "深層学習",
    "大規模言語モデル", "エージェント", "プロンプト", "copilot", "codex",
    "github copilot", "perplexity", "mistral", "llama", "ollama",
]


def is_ai_related(text: str) -> bool:
    """テキストがAI関連かどうか判定"""
    text_lower = text.lower()
    return any(kw in text_lower for kw in AI_KEYWORDS)


def score_x_item(item: dict) -> int:
    """X投稿のスコアリング（高いほど優先）"""
    score = 0
    combined = (item.get("title", "") + " " + item.get("summary", "")).lower()

    # AI関連キーワードのスコア
    for kw in AI_KEYWORDS:
        if kw in combined:
            score += 2

    # リリース・新機能情報は優先
    release_kws = ["release", "launch", "new", "announce", "update", "リリース",
                   "発表", "新機能", "アップデート", "公開", "登場"]
    for kw in release_kws:
        if kw in combined:
            score += 3

    # Tips・使い方は優先
    tips_kws = ["tips", "how to", "使い方", "方法", "できる", "便利", "おすすめ"]
    for kw in tips_kws:
        if kw in combined:
            score += 2

    # RT（リポスト）は減点
    if combined.startswith("rt @") or "RT @" in (item.get("title", "") or ""):
        score -= 3

    return score


def select_top_x_items(x_items: List[dict], max_items: int = 10) -> List[dict]:
    """XのアイテムからAI関連のトップN件を選定"""
    ai_items = [item for item in x_items if is_ai_related(
        item.get("title", "") + " " + item.get("summary", "")
    )]

    if not ai_items:
        # AI関連が見つからない場合は全件から選ぶ
        ai_items = x_items

    scored = sorted(ai_items, key=lambda x: (score_x_item(x), x["date"]), reverse=True)
    return scored[:max_items]


def _strip_html(text: str) -> str:
    """簡易HTMLタグ除去"""
    text = re.sub(r"<[^>]+>", "", text)
    text = re.sub(r"&amp;", "&", text)
    text = re.sub(r"&lt;", "<", text)
    text = re.sub(r"&gt;", ">", text)
    text = re.sub(r"&quot;", '"', text)
    text = re.sub(r"&#39;", "'", text)
    text = re.sub(r"&nbsp;", " ", text)
    text = text.replace("\xa0", " ")  # non-breaking space
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _truncate(text: str, max_len: int = 300) -> str:
    text = _strip_html(text)
    if len(text) > max_len:
        return text[:max_len] + "..."
    return text


def summarize_with_openai(title: str, content: str) -> Optional[str]:
    """OpenAI APIで要約生成"""
    if not OPENAI_API_KEY:
        return None
    try:
        payload = {
            "model": "gpt-4o-mini",
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "あなたはAIニュースの編集者です。"
                        "与えられた記事のタイトルと内容から、技術者でない人にも伝わる"
                        "平易な日本語で1〜2文の要約を作成してください。"
                        "「何が発表・変わったのか」「何が役立つのか」が伝わるようにしてください。"
                    ),
                },
                {
                    "role": "user",
                    "content": f"タイトル: {title}\n内容: {content[:1000]}",
                },
            ],
            "max_tokens": 150,
            "temperature": 0.3,
        }
        resp = requests.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return None


def summarize_with_anthropic(title: str, content: str) -> Optional[str]:
    """Anthropic APIで要約生成"""
    if not ANTHROPIC_API_KEY:
        return None
    try:
        payload = {
            "model": "claude-3-haiku-20240307",
            "max_tokens": 150,
            "messages": [
                {
                    "role": "user",
                    "content": (
                        "以下の記事を技術者でない人にも伝わる平易な日本語で1〜2文に要約してください。\n"
                        "「何が発表・変わったのか」「何が役立つのか」が伝わるようにしてください。\n\n"
                        f"タイトル: {title}\n内容: {content[:1000]}"
                    ),
                }
            ],
        }
        resp = requests.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=20,
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"].strip()
    except Exception:
        return None


def resolve_google_news_url(url: str) -> str:
    """Google NewsのリダイレクトURLから実際の記事URLを取得"""
    if "news.google.com" not in url:
        return url
    try:
        resp = requests.get(url, allow_redirects=True, timeout=10,
                           headers={"User-Agent": "Mozilla/5.0"})
        final_url = resp.url
        if "news.google.com" not in final_url:
            return final_url
    except Exception:
        pass
    return url


def generate_summary(title: str, content: str) -> str:
    """利用可能なAPIで要約を生成、失敗時はコンテンツを整形して返す"""
    summary = summarize_with_openai(title, content)
    if summary:
        return summary

    summary = summarize_with_anthropic(title, content)
    if summary:
        return summary

    # APIが利用できない場合は内容を整形して返す
    clean = _truncate(content, 150)
    if clean:
        return clean
    return title


def _normalize_spaces(text: str) -> str:
    """全角スペースを半角に、連続空白を1つに正規化"""
    text = text.replace("\u3000", " ")  # full-width space
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _clean_summary_for_display(title: str, raw_summary: str) -> str:
    """要約を表示用にクリーンアップ。タイトルと実質同じ内容なら空文字を返す"""
    cleaned = _strip_html(raw_summary).strip()
    if not cleaned:
        return ""
    title_norm = _normalize_spaces(title)
    cleaned_norm = _normalize_spaces(cleaned)
    # タイトルと同一、またはタイトルで始まる場合はスキップ（ソース名付きのパターンも）
    if cleaned_norm.startswith(title_norm) or title_norm.startswith(cleaned_norm):
        return ""
    # タイトルが含まれていて残りが短い場合（「タイトル ソース名」パターン）
    if title_norm in cleaned_norm and len(cleaned_norm) < len(title_norm) + 30:
        return ""
    return cleaned_norm[:200]


def enrich_items(data: dict) -> dict:
    """各アイテムに要約を付与してデータを充実させる"""
    # RSS フィードの要約
    for source, items in data["rss"].items():
        for item in items:
            raw_summary = item.get("summary", "")
            cleaned = _clean_summary_for_display(item["title"], raw_summary)
            if cleaned:
                item["summary_ja"] = generate_summary(item["title"], cleaned)
            else:
                item["summary_ja"] = ""
            # Google NewsのリンクをオリジナルURLに解決（ベストエフォート）
            if "news.google.com" in item.get("link", ""):
                item["link"] = resolve_google_news_url(item["link"])

    # X アイテムの要約
    top_x = select_top_x_items(data.get("x_all", []), max_items=10)
    for item in top_x:
        content = item.get("summary", item.get("title", ""))
        item["summary_ja"] = _truncate(_strip_html(content), 150)

    data["x_top"] = top_x
    return data
