import secrets

import bcrypt
from fastapi import Cookie, Depends, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer
from sqlmodel import Session

from app.config import settings
from app.db import get_session
from app.models import User, UserRole

_confirm_serializer = URLSafeTimedSerializer(settings.secret_key, salt="confirm-occurrence")
_session_serializer = URLSafeTimedSerializer(settings.secret_key, salt="user-session")


def make_confirm_token(occurrence_id: int) -> str:
    return _confirm_serializer.dumps({"occurrence_id": occurrence_id})


def read_confirm_token(token: str) -> int:
    try:
        data = _confirm_serializer.loads(token, max_age=settings.confirm_token_max_age_seconds)
    except SignatureExpired as exc:
        raise HTTPException(status_code=400, detail="Link expirado") from exc
    except BadSignature as exc:
        raise HTTPException(status_code=400, detail="Link invalido") from exc
    return data["occurrence_id"]


# ---------------------------------------------------------------------------
# Senha
# ---------------------------------------------------------------------------


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), password_hash.encode())
    except ValueError:
        # hash malformado/vazio -- nunca autentica
        return False


# ---------------------------------------------------------------------------
# Sessao (cookie assinado) -- generalizado pra qualquer usuario, nao so' admin
# ---------------------------------------------------------------------------


def make_session_token(user_id: int) -> str:
    return _session_serializer.dumps({"user_id": user_id})


def get_current_user(
    session_token: str | None = Cookie(default=None),
    session: Session = Depends(get_session),
) -> User:
    if not session_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nao autenticado")
    try:
        data = _session_serializer.loads(session_token, max_age=settings.session_max_age_seconds)
    except (BadSignature, SignatureExpired) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada") from exc

    user = session.get(User, data.get("user_id"))
    # Rechecha `active` a cada request -- desativacao por admin tem efeito
    # imediato, nao espera o cookie expirar.
    if not user or not user.active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao admin")
    return user


# ---------------------------------------------------------------------------
# Convite -- token aleatorio (nao assinado): o estado de uso/expiracao/
# revogacao mora no banco (tabela Invite), nao no proprio token. So' o hash
# fica persistido.
# ---------------------------------------------------------------------------


def generate_invite_token() -> str:
    return secrets.token_urlsafe(32)


def hash_invite_token(token: str) -> str:
    # sha256 simples basta aqui: e' so' pra nao guardar o token em claro no
    # banco, o token em si ja' tem entropia suficiente (nao e' senha de
    # usuario escolhida por humano, nao precisa de bcrypt/custo alto).
    import hashlib

    return hashlib.sha256(token.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Codigo de vinculo do Telegram -- curto de proposito (usuario as vezes
# digita a mao no chat, nao so' abre o deep link). Guardado em claro no
# proprio User (nao e' credencial de acesso, so' identifica pra quem
# associar o /start que chegar no webhook -- e expira em poucos minutos).
# ---------------------------------------------------------------------------

_TELEGRAM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # sem 0/O/1/I -- evita confusao ao digitar


def generate_telegram_link_code() -> str:
    return "".join(secrets.choice(_TELEGRAM_CODE_ALPHABET) for _ in range(6))
