from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

import pytest
from sqlmodel import Session, select

from app.models import Invite, User


def _extract_token(invite_url: str) -> str:
    return parse_qs(urlparse(invite_url).query)["token"][0]


def test_invite_can_be_used_once(admin_client, engine):
    resp = admin_client.post("/api/admin/invites")
    assert resp.status_code == 200
    token = _extract_token(resp.json()["invite_url"])

    register = admin_client.post(
        "/api/auth/register", json={"token": token, "username": "novo_usuario", "password": "senhaforte1"}
    )
    assert register.status_code == 200

    reuse = admin_client.post(
        "/api/auth/register", json={"token": token, "username": "outra_conta", "password": "senhaforte1"}
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
        "/api/auth/register", json={"token": token, "username": "tarde_demais", "password": "senhaforte1"}
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
        "/api/auth/register", json={"token": token, "username": "revogado", "password": "senhaforte1"}
    )
    assert register.status_code == 400
    assert "revogado" in register.json()["detail"]


def test_invalid_token_is_rejected(client):
    register = client.post(
        "/api/auth/register", json={"token": "token-que-nao-existe", "username": "xyz", "password": "senhaforte1"}
    )
    assert register.status_code == 400
    assert "inválido" in register.json()["detail"]


def _register(client, token, username, password):
    return client.post("/api/auth/register", json={"token": token, "username": username, "password": password})


def _new_token(admin_client):
    return _extract_token(admin_client.post("/api/admin/invites").json()["invite_url"])


@pytest.mark.parametrize(
    "username,password",
    [
        ("", ""),  # caso real: conta criada com campos vazios
        ("", "senhaforte1"),
        ("   ", "senhaforte1"),  # so' espaco conta como vazio
        ("ab", "senhaforte1"),  # usuario < 3
        (" ab ", "senhaforte1"),  # usuario < 3 depois do strip
        ("nova_conta", ""),
        ("nova_conta", "abc1234"),  # senha < 8
        ("nova_conta", "somenteletras"),  # sem numero
        ("nova_conta", "12345678"),  # sem letra
    ],
)
def test_register_rejects_invalid_credentials(admin_client, engine, username, password):
    token = _new_token(admin_client)

    resp = _register(admin_client, token, username, password)
    assert resp.status_code == 422

    # convite continua valido -- a pessoa pode corrigir e tentar de novo
    with Session(engine) as session:
        invite = session.exec(select(Invite)).first()
        assert invite.used_at is None
    assert _register(admin_client, token, "nova_conta", "senhaforte1").status_code == 200


def test_register_strips_username(admin_client, engine):
    token = _new_token(admin_client)
    assert _register(admin_client, token, "  maria  ", "senhaforte1").status_code == 200

    with Session(engine) as session:
        assert session.exec(select(User).where(User.username == "maria")).first() is not None
