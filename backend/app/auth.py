from fastapi import Cookie, HTTPException, status
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from app.config import settings

_confirm_serializer = URLSafeTimedSerializer(settings.secret_key, salt="confirm-occurrence")
_admin_serializer = URLSafeTimedSerializer(settings.secret_key, salt="admin-session")


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


def make_admin_session_token() -> str:
    return _admin_serializer.dumps({"admin": True})


def require_admin(admin_session: str | None = Cookie(default=None)) -> None:
    if not admin_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nao autenticado")
    try:
        data = _admin_serializer.loads(admin_session, max_age=settings.admin_session_max_age_seconds)
    except (BadSignature, SignatureExpired) as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Sessao invalida ou expirada") from exc
    if not data.get("admin"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nao autenticado")
