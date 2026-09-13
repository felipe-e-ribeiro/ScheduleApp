from sqlmodel import Session

from app.auth import hash_password
from app.models import User, UserRole


def _create_user(engine, username: str, role: UserRole = UserRole.user) -> int:
    with Session(engine) as session:
        user = User(username=username, password_hash=hash_password("senha-forte"), role=role)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user.id


def test_regular_user_cannot_access_admin_routes(client, engine):
    _create_user(engine, "comum")
    resp = client.post("/api/auth/login", json={"username": "comum", "password": "senha-forte"})
    assert resp.status_code == 200

    assert client.get("/api/admin/users").status_code == 403
    assert client.post("/api/admin/invites").status_code == 403


def test_admin_can_access_admin_routes(admin_client):
    assert admin_client.get("/api/admin/users").status_code == 200
    assert admin_client.post("/api/admin/invites").status_code == 200


def test_admin_cannot_deactivate_self(admin_client, admin_user):
    resp = admin_client.patch(f"/api/admin/users/{admin_user.id}", json={"active": False})
    assert resp.status_code == 400


def test_admin_can_deactivate_other_user_and_it_takes_effect_immediately(admin_client, engine):
    other_id = _create_user(engine, "vai_ser_desativado")

    resp = admin_client.patch(f"/api/admin/users/{other_id}", json={"active": False})
    assert resp.status_code == 200
    assert resp.json()["active"] is False

    login = admin_client.post("/api/auth/login", json={"username": "vai_ser_desativado", "password": "senha-forte"})
    assert login.status_code == 401
