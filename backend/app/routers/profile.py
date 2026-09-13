from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.auth import generate_telegram_link_code, get_current_user
from app.config import settings
from app.db import get_session
from app.models import User
from app.schemas import TelegramLinkCodeRead
from app.telegram import get_bot_username

router = APIRouter(prefix="/api/profile", tags=["profile"])


@router.post("/telegram/link-code", response_model=TelegramLinkCodeRead)
def create_telegram_link_code(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    """Gera (ou substitui) o codigo pendente de vinculo do Telegram deste
    usuario. So' existe um por vez -- chamar de novo invalida o anterior."""
    code = generate_telegram_link_code()
    expires_at = datetime.utcnow() + timedelta(seconds=settings.telegram_link_code_max_age_seconds)

    user.pending_telegram_code = code
    user.pending_telegram_code_expires_at = expires_at
    session.add(user)
    session.commit()

    return TelegramLinkCodeRead(
        code=code,
        deep_link=f"https://t.me/{get_bot_username()}?start={code}",
        expires_at=expires_at,
    )
