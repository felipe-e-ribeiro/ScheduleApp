from datetime import datetime

from fastapi import APIRouter, Depends, Header, Request
from sqlmodel import Session, select

from app.config import settings
from app.db import get_session
from app.models import User
from app.telegram import send_message

router = APIRouter(prefix="/api/telegram", tags=["telegram"])

_HELP_TEXT = (
    "Oi! Pra vincular esse chat à sua conta do pulse:\n"
    "1. Abra o pulse, vá em Perfil\n"
    "2. Gere um código de vinculação\n"
    "3. Mande /start &lt;código&gt; aqui"
)


def _extract_start_code(text: str) -> str | None:
    parts = text.strip().split(maxsplit=1)
    if not parts or parts[0] != "/start" or len(parts) < 2:
        return None
    return parts[1].strip()


@router.post("/webhook")
async def telegram_webhook(
    request: Request,
    x_telegram_bot_api_secret_token: str | None = Header(default=None),
    session: Session = Depends(get_session),
):
    # Header ausente/errado -- nunca 403 (evita retry do Telegram e nao
    # revela nada pra quem nao tem o secret). So' ignora.
    if not x_telegram_bot_api_secret_token or x_telegram_bot_api_secret_token != settings.telegram_webhook_secret:
        return {"ok": True}

    body = await request.json()
    message = body.get("message") or {}
    chat = message.get("chat") or {}
    chat_id = chat.get("id")
    text = message.get("text")

    if not chat_id or not text:
        return {"ok": True}

    code = _extract_start_code(text)
    if code is None:
        send_message(str(chat_id), _HELP_TEXT)
        return {"ok": True}

    user = session.exec(select(User).where(User.pending_telegram_code == code)).first()
    if not user or not user.pending_telegram_code_expires_at or user.pending_telegram_code_expires_at < datetime.utcnow():
        send_message(str(chat_id), "Código inválido ou expirado. Gere um novo na página de Perfil do pulse.")
        return {"ok": True}

    conflicting = session.exec(select(User).where(User.telegram_chat_id == str(chat_id))).first()
    if conflicting and conflicting.id != user.id:
        send_message(str(chat_id), "Esse Telegram já está vinculado a outra conta do pulse.")
        return {"ok": True}

    user.telegram_chat_id = str(chat_id)
    user.pending_telegram_code = None
    user.pending_telegram_code_expires_at = None
    session.add(user)
    session.commit()

    send_message(str(chat_id), f"Vinculado com sucesso ✅ Notificações do pulse pra @{user.username} chegam por aqui agora.")
    return {"ok": True}
