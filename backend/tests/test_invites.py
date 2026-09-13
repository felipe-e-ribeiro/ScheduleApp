from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

from sqlmodel import Session, select

from app.models import Invite


def _extract_token(invite_url: str) -> str:
    return parse_qs(urlparse(invite_url).query)["token"][0]


def test_invite_can_be_used_once(admin_client, engine):
    resp = admin_client.post("/api/admin/invites")
    assert resp.status_code == 200
    token = _extract_token(resp.json()["invite_url"])

    register = admin_client.post(
        "/api/auth/register", json={"token": token, "username": "novo_usuario", "password": "senha-forte"}
    )
    assert register.status_code == 200

    reuse = admin_client.post(
        "/api/auth/register", json={"token": token, "username": "outra_conta", "password": "senha-forte"}
    )
    assert reuse.status_code == 400
    assert "já utilizado" in reuse.json()["detail"]


def test_invite_expired_is_rejected(admin_client, engine):
    resp = admin_client.post("/api/admin/invites")
    token = _extract_token(resp.json()["invite_url"])

    # forca o convite a ja estar expirado
    with Session(engine) as session:
        invite = session.exec(select(Invite)).first()
        invite.expires_at = datetime.utcnow() - timedelta(minutes=1)
        session.add(invite)
        session.commit()

    register = admin_client.post(
        "/api/auth/register", json={"token": token, "username": "tarde_demais", "password": "senha-forte"}
    )
    assert register.status_code == 400
    assert "expirado" in register.json()["detail"]


def test_invite_revoked_is_rejected(admin_client):
    resp = admin_client.post("/api/admin/invites")
    body = resp.json()
    token = _extract_token(body["invite_url"])

    revoke = admin_client.delete(f"/api/admin/invites/{body['id']}")
    assert revoke.status_code == 200

    register = admin_client.post(
        "/api/auth/register", json={"token": token, "username": "revogado", "password": "senha-forte"}
    )
    assert register.status_code == 400
    assert "revogado" in register.json()["detail"]


def test_invalid_token_is_rejected(client):
    register = client.post(
        "/api/auth/register", json={"token": "token-que-nao-existe", "username": "x", "password": "senha-forte"}
    )
    assert register.status_code == 400
    assert "inválido" in register.json()["detail"]
