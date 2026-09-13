from functools import lru_cache

import httpx

from app.config import settings


@lru_cache(maxsize=1)
def get_bot_username() -> str:
    """@username do bot -- usado pra montar o deep link de vinculo
    (`t.me/<username>?start=<codigo>`). Consultado uma vez via `getMe` e
    cacheado em memoria (nao muda em runtime)."""
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/getMe"
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    return resp.json()["result"]["username"]


def send_message(chat_id: str, text: str) -> None:
    """Envia uma mensagem via Bot API do Telegram pra um chat especifico
    (DM de um usuario, nunca um grupo compartilhado)."""
    if not settings.telegram_bot_token:
        raise RuntimeError("Telegram nao configurado (TELEGRAM_BOT_TOKEN)")

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    resp = httpx.post(
        url,
        json={
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        },
        timeout=10,
    )
    resp.raise_for_status()
