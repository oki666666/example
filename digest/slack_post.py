"""
Slackへのメッセージ投稿処理

環境変数:
  SLACK_BOT_TOKEN   : Slack Bot Token (xoxb-...)  優先
  SLACK_WEBHOOK_URL : Slack Incoming Webhook URL  代替
"""

import os
import logging
import requests

logger = logging.getLogger(__name__)

SLACK_CHANNEL = "C07SWPXBL7L"  # #times-oki


def _post_via_bot_token(text: str, channel: str) -> bool:
    """Bot Token経由でSlackに投稿"""
    token = os.environ.get("SLACK_BOT_TOKEN", "")
    if not token:
        return False

    url = "https://slack.com/api/chat.postMessage"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=utf-8",
    }
    payload = {
        "channel": channel,
        "text": text,
        "mrkdwn": True,
        "unfurl_links": False,
        "unfurl_media": False,
    }

    try:
        resp = requests.post(url, headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if data.get("ok"):
            logger.info(f"Slack Bot Token投稿成功: ts={data.get('ts')}")
            return True
        else:
            logger.error(f"Slack APIエラー: {data.get('error')}")
            return False
    except Exception as e:
        logger.error(f"Slack Bot Token投稿例外: {e}")
        return False


def _post_via_webhook(text: str) -> bool:
    """Incoming Webhook経由でSlackに投稿"""
    webhook_url = os.environ.get("SLACK_WEBHOOK_URL", "")
    if not webhook_url:
        return False

    payload = {"text": text, "mrkdwn": True}

    try:
        resp = requests.post(webhook_url, json=payload, timeout=30)
        if resp.status_code == 200 and resp.text == "ok":
            logger.info("Slack Webhook投稿成功")
            return True
        else:
            logger.error(f"Slack Webhook失敗: {resp.status_code} {resp.text}")
            return False
    except Exception as e:
        logger.error(f"Slack Webhook例外: {e}")
        return False


def post_to_slack(text: str, channel: str = SLACK_CHANNEL) -> bool:
    """
    Slackにメッセージを投稿する。
    SLACK_BOT_TOKEN → SLACK_WEBHOOK_URL の順で試みる。
    """
    if os.environ.get("SLACK_BOT_TOKEN"):
        return _post_via_bot_token(text, channel)
    elif os.environ.get("SLACK_WEBHOOK_URL"):
        return _post_via_webhook(text)
    else:
        logger.error(
            "SLACK_BOT_TOKEN または SLACK_WEBHOOK_URL が設定されていません。"
            " Cursor Dashboard > Secrets から設定してください。"
        )
        return False


def post_message_in_chunks(text: str, channel: str = SLACK_CHANNEL, max_length: int = 3000) -> bool:
    """
    長いメッセージを複数チャンクに分割して投稿する
    """
    if len(text) <= max_length:
        return post_to_slack(text, channel)

    separator = "\n━━━━━━━━━━━━━━━━━━━\n"
    sections = text.split(separator)

    chunks: list[str] = []
    current_chunk = ""

    for section in sections:
        candidate = (current_chunk + separator + section) if current_chunk else section
        if len(candidate) > max_length and current_chunk:
            chunks.append(current_chunk)
            current_chunk = section
        else:
            current_chunk = candidate

    if current_chunk:
        chunks.append(current_chunk)

    all_ok = True
    for chunk in chunks:
        ok = post_to_slack(chunk, channel)
        if not ok:
            all_ok = False

    return all_ok
