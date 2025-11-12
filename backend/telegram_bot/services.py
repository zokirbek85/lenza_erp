import os
import requests
from django.conf import settings


def _get_token_and_chat():
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', None)
    chat_id = getattr(settings, 'TELEGRAM_GROUP_CHAT_ID', None)
    if not token or not chat_id:
        print('[Telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_GROUP_CHAT_ID; message skipped.')
        return None, None
    return token, chat_id


def send_telegram_message(text: str, image_path: str | None = None, parse_mode: str = 'HTML') -> None:
    token, chat_id = _get_token_and_chat()
    if not token or not chat_id:
        return

    print(f'[Telegram] Attempting to send message to chat_id: {chat_id}')
    print(f'[Telegram] Message text: {text[:100]}...')
    
    try:
        if image_path and os.path.exists(image_path):
            print(f'[Telegram] Sending with image: {image_path}')
            url = f'https://api.telegram.org/bot{token}/sendPhoto'
            with open(image_path, 'rb') as photo:
                files = {'photo': photo}
                data = {'chat_id': chat_id, 'caption': text, 'parse_mode': parse_mode}
                response = requests.post(url, data=data, files=files, timeout=10)
        else:
            print('[Telegram] Sending text-only message')
            url = f'https://api.telegram.org/bot{token}/sendMessage'
            payload = {'chat_id': chat_id, 'text': text, 'parse_mode': parse_mode}
            response = requests.post(url, data=payload, timeout=5)

        if response.status_code != 200:
            print(f'[Telegram] Failed to send message: {response.status_code} {response.text}')
        else:
            print(f'[Telegram] Message sent successfully!')
    except requests.RequestException as exc:
        print('[Telegram] Error sending message:', exc)
