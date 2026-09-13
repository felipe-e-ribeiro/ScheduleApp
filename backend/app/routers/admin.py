from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import generate_invite_token, hash_invite_token, require_admin
from app.config import settings
from app.db import get_session
from app.models import Invite, User, UserRole
from app.schemas import InviteRead, UserRead, UserUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"], dependencies=[Depends(require_admin)])


def _invite_url(token: str) -> str:
    return f"{settings.frontend_base_url}/register?token={token}"


# ---------------------------------------------------------------------------
# usuarios
# ---------------------------------------------------------------------------


@router.get("/users", response_model=list[UserRead])
def list_users(session: Session = Depends(get_session)):
    # So' contas "user" -- o admin nao aparece na propria tela de gestao
    # (nao faz sentido ativar/desativar a si mesmo, e so' existe 1 admin).
    return session.exec(select(User).where(User.role == UserRole.user).order_by(User.id)).all()


@router.patch("/users/{user_id}", response_model=UserRead)
def update_user(user_id: int, payload: UserUpdate, admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if user.id == admin.id and not payload.active:
        raise HTTPException(status_code=400, detail="Não é possível desativar sua própria conta")

    user.active = payload.active
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


# ---------------------------------------------------------------------------
# convites
# ---------------------------------------------------------------------------


@router.get("/invites", response_model=list[InviteRead])
def list_invites(session: Session = Depends(get_session)):
    invites = session.exec(select(Invite).order_by(Invite.id.desc())).all()
    # O token em si nao fica no banco (so' o hash) -- convites ja emitidos
    # so' mostram a URL pra quem ja' copiou na hora da criacao; aqui e' so'
    # pra acompanhar status (pendente/usado/expirado/revogado).
    return [
        InviteRead(
            id=inv.id,
            invite_url="",
            expires_at=inv.expires_at,
            used_at=inv.used_at,
            revoked_at=inv.revoked_at,
        )
        for inv in invites
    ]


@router.post("/invites", response_model=InviteRead)
def create_invite(admin: User = Depends(require_admin), session: Session = Depends(get_session)):
    token = generate_invite_token()
    invite = Invite(
        token_hash=hash_invite_token(token),
        created_by_id=admin.id,
        expires_at=datetime.utcnow() + timedelta(seconds=settings.invite_max_age_seconds),
    )
    session.add(invite)
    session.commit()
    session.refresh(invite)

    return InviteRead(
        id=invite.id,
        invite_url=_invite_url(token),
        expires_at=invite.expires_at,
        used_at=invite.used_at,
        revoked_at=invite.revoked_at,
    )


@router.delete("/invites/{invite_id}")
def revoke_invite(invite_id: int, session: Session = Depends(get_session)):
    invite = session.get(Invite, invite_id)
    if not invite:
        raise HTTPException(status_code=404, detail="Convite não encontrado")
    if invite.used_at is not None:
        raise HTTPException(status_code=400, detail="Convite já foi utilizado, não pode ser revogado")

    invite.revoked_at = datetime.utcnow()
    session.add(invite)
    session.commit()
    return {"ok": True}
