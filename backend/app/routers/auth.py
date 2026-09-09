import hmac

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel

from app.auth import make_admin_session_token, require_admin
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginRequest(BaseModel):
    username: str
    password: str


def _constant_time_eq(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


@router.post("/login")
def login(payload: LoginRequest, response: Response):
    valid = _constant_time_eq(payload.username, settings.admin_username) and _constant_time_eq(
        payload.password, settings.admin_password
    )
    if not valid:
        raise HTTPException(status_code=401, detail="Usuário ou senha incorretos")

    token = make_admin_session_token()
    response.set_cookie(
        key="admin_session",
        value=token,
        httponly=True,
        samesite="lax",
        secure=False,  # troque para True em producao (https)
        max_age=settings.admin_session_max_age_seconds,
    )
    return {"ok": True}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie("admin_session")
    return {"ok": True}


@router.get("/me", dependencies=[Depends(require_admin)])
def me():
    """Usado pelo frontend pra saber, ao carregar a pagina, se a sessao ainda e valida."""
    return {"ok": True, "username": settings.admin_username}
