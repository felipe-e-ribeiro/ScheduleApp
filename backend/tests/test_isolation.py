from fastapi.testclient import TestClient
from sqlmodel import Session

from app.auth import hash_password
from app.db import get_session
from app.main import app
from app.models import User, UserRole


def _make_logged_in_client(engine, username: str) -> TestClient:
    with Session(engine) as session:
        user = User(username=username, password_hash=hash_password("senha-forte"), role=UserRole.user)
        session.add(user)
        session.commit()

    def _get_session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = _get_session_override
    c = TestClient(app)
    resp = c.post("/api/auth/login", json={"username": username, "password": "senha-forte"})
    assert resp.status_code == 200
    return c


def _create_habit(c: TestClient, name: str) -> int:
    resp = c.post(
        "/api/habits",
        json={"name": name, "type": "custom", "times": ["08:00"], "days_of_week": None},
    )
    assert resp.status_code == 200
    return resp.json()["id"]


def test_user_cannot_see_another_users_habit(engine):
    client_a = _make_logged_in_client(engine, "user_a")
    client_b = _make_logged_in_client(engine, "user_b")

    habit_a_id = _create_habit(client_a, "Hábito da A")

    # B nao ve o habit da A na listagem
    listing_b = client_b.get("/api/habits")
    assert listing_b.status_code == 200
    assert habit_a_id not in [h["id"] for h in listing_b.json()]

    # B nao consegue editar o habit da A mesmo sabendo o ID direto
    patch_b = client_b.patch(f"/api/habits/{habit_a_id}", json={"name": "sequestrado"})
    assert patch_b.status_code == 404

    # A continua vendo o proprio habit normalmente
    listing_a = client_a.get("/api/habits")
    assert habit_a_id in [h["id"] for h in listing_a.json()]

    app.dependency_overrides.clear()
