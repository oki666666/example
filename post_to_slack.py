"""
AI ニュースダイジェスト - Slack投稿モジュール
"""

import os
import requests
import json

SLACK_BOT_TOKEN = os.environ.get("SLACK_BOT_TOKEN", "")
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL", "")
SLACK_CHANNEL_ID = "C07SWPXBL7L"  # #times-oki


def post_via_webhook(message: str) -> bool:
    """Incoming Webhookを使ってSlackに投稿"""
    if not SLACK_WEBHOOK_URL:
        return False
    try:
        resp = requests.post(
            SLACK_WEBHOOK_URL,
            json={"text": message},
            timeout=15,
        )
        return resp.status_code == 200
    except Exception as e:
        print(f"Webhook投稿エラー: {e}")
        return False


def post_via_bot_token(message: str) -> bool:
    """Bot Tokenを使ってSlack Web APIで投稿"""
    if not SLACK_BOT_TOKEN:
        return False
    try:
        resp = requests.post(
            "https://slack.com/api/chat.postMessage",
            headers={
                "Authorization": f"Bearer {SLACK_BOT_TOKEN}",
                "Content-Type": "application/json; charset=utf-8",
            },
            json={
                "channel": SLACK_CHANNEL_ID,
                "text": message,
                "unfurl_links": False,
                "unfurl_media": False,
            },
            timeout=15,
        )
        resp.raise_for_status()
        result = resp.json()
        if result.get("ok"):
            print(f"Slack投稿成功: ts={result.get('ts', '')}")
            return True
        else:
            print(f"Slack API エラー: {result.get('error', 'unknown')}")
            return False
    except Exception as e:
        print(f"Bot Token投稿エラー: {e}")
        return False


def post_message(message: str) -> bool:
    """利用可能な方法でSlackに投稿"""
    # Bot Tokenを優先
    if SLACK_BOT_TOKEN:
        return post_via_bot_token(message)
    # Webhookで代替
    if SLACK_WEBHOOK_URL:
        return post_via_webhook(message)
    print("警告: SLACK_BOT_TOKEN も SLACK_WEBHOOK_URL も設定されていません。")
    print("投稿予定メッセージ:")
    print(message)
    return False
