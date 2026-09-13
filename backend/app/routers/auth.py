from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlmodel import Session, select

from app.auth import (
    get_current_user,
    hash_invite_token,
    hash_password,
    make_session_token,
    verify_password,
)
from app.config import settings
from app.db import get_session
from app.models import Invite, User, UserRole
from app.schemas import RegisterRequest

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


def _set_session_cookie(response: Response, user: User) -> None:
    token = make_session_token(user.id)
    response.set_cookie(
        key="session_token",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # troque para True em producao (https)
        max_age=settings.session_max_age_seconds,
    )


@router.post("/login")
def login(payload: LoginRequest, response: Response, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == payload.username)).first()
    # Mensagem generica de proposito -- nao revela se foi usuario inexistente,
    # senha errada ou conta desativada (evita enumeration).
    if not user or not user.active or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")

    _set_session_cookie(response, user)
    return {"ok": True}


@router.post("/register")
def register(payload: RegisterRequest, response: Response, session: Session = Depends(get_session)):
    token_hash = hash_invite_token(payload.token)
    invite = session.exec(select(Invite).where(Invite.token_hash == token_hash)).first()

    if not invite:
        raise HTTPException(status_code=400, detail="Convite inválido")
    if invite.revoked_at is not None:
        raise HTTPException(status_code=400, detail="Convite revogado")
    if invite.used_at is not None:
        raise HTTPException(status_code=400, detail="Convite já utilizado")
    if invite.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="Convite expirado")

    existing = session.exec(select(User).where(User.username == payload.username)).first()
    if existing:
        raise HTTPException(status_code=409, detail="Nome de usuário já existe")

    user = User(username=payload.username, password_hash=hash_password(payload.password), role=UserRole.user)
    session.add(user)
    session.commit()
    session.refresh(user)

    invite.used_at = datetime.utcnow()
    invite.used_by_id = user.id
    session.add(invite)
    session.commit()

    _set_session_cookie(response, user)
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("session_token")
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    """Usado pelo frontend pra saber, ao carregar a pagina, se a sessao ainda e valida."""
    return {
        "ok": True,
        "username": user.username,
        "role": user.role,
        "telegram_linked": user.telegram_chat_id is not None,
    }
