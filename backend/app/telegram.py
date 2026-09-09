import httpx

from app.config import settings


def send_message(text: str) -> None:
    """Envia uma mensagem via Bot API do Telegram. Uso somente de envio (sem webhook)."""
    if not settings.telegram_bot_token or not settings.telegram_chat_id:
        raise RuntimeError("Telegram nao configurado (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID)")

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    resp = httpx.post(
        url,
        json={
            "chat_id": settings.telegram_chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        },
        timeout=10,
    )
    resp.raise_for_status()
