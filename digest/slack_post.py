"""Slack投稿モジュール"""
import os
import json
import requests
from config import CHANNEL

TIMEOUT = 10


def post_to_slack(message: str) -> bool:
    """SLACK_BOT_TOKEN または SLACK_WEBHOOK_URL を使ってSlackに投稿"""
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    webhook = os.environ.get("SLACK_WEBHOOK_URL", "")

    if token:
        return _post_via_api(token, message)
    elif webhook:
        return _post_via_webhook(webhook, message)
    else:
        print("  [WARN] SLACK_BOT_TOKEN も SLACK_WEBHOOK_URL も未設定")
        return False


def _post_via_api(token: str, message: str) -> bool:
    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
    }
    payload = {"channel": CHANNEL, "text": message, "mrkdwn": True}
    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=TIMEOUT)
        data = resp.json()
        if data.get("ok"):
            print(f"  Slack投稿成功 (ts={data.get('ts')})")
            return True
        else:
            print(f"  [ERROR] Slack API: {data.get('error')}")
            return False
    except Exception as e:
        print(f"  [ERROR] Slack投稿失敗: {e}")
        return False


def _post_via_webhook(webhook_url: str, message: str) -> bool:
    payload = {"text": message}
    try:
        resp = requests.post(webhook_url, json=payload, timeout=TIMEOUT)
        if resp.status_code == 200:
            print("  Slack投稿成功 (webhook)")
            return True
        else:
            print(f"  [ERROR] Webhook: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        print(f"  [ERROR] Webhook投稿失敗: {e}")
        return False
