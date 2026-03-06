"""Slack投稿モジュール"""

import os
import json
import requests


def post_to_slack(message: str, channel: str = "C07SWPXBL7L") -> bool:
    """SlackにメッセージをBOT TOKEN経由で投稿"""
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL", "")

    if token:
        return _post_via_bot_token(message, channel, token)
    elif webhook_url:
        return _post_via_webhook(message, webhook_url)
    else:
        print("[ERROR] SLACK_BOT_TOKEN または SLACK_WEBHOOK_URL が設定されていません")
        print("[INFO] 投稿内容をファイルに保存します: /workspace/digest/output.txt")
        with open("/workspace/digest/output.txt", "w") as f:
            f.write(message)
        return False


def _post_via_bot_token(message: str, channel: str, token: str) -> bool:
    """Bot Tokenを使ってSlack API経由で投稿"""
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
    }
    payload = {
        "channel": channel,
        "text": message,
        "mrkdwn": True,
    }
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=15)
        data = resp.json()
        if data.get("ok"):
            print(f"[OK] Slackに投稿しました (channel: {channel})")
            return True
        else:
            print(f"[ERROR] Slack API エラー: {data.get('error', 'unknown')}")
            return False
    except Exception as e:
        print(f"[ERROR] Slack投稿例外: {e}")
        return False


def _post_via_webhook(message: str, webhook_url: str) -> bool:
    """Webhook URLを使って投稿"""
    payload = {"text": message}
    try:
        resp = requests.post(webhook_url, json=payload, timeout=15)
        if resp.status_code == 200:
            print("[OK] Webhookでメッセージを投稿しました")
            return True
        else:
            print(f"[ERROR] Webhook失敗: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        print(f"[ERROR] Webhook投稿例外: {e}")
        return False
