import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from app.auth import hash_password
from app.db import get_session
from app.main import app
from app.models import User, UserRole


@pytest.fixture()
def engine():
    # SQLite em memoria, compartilhado entre conexoes (StaticPool) --
    # equivalente ao Postgres real pros propositos destes testes (nao
    # dependemos de nenhum recurso especifico de dialeto).
    eng = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    SQLModel.metadata.create_all(eng)
    yield eng
    SQLModel.metadata.drop_all(eng)


@pytest.fixture()
def client(engine):
    def _get_session_override():
        with Session(engine) as session:
            yield session

    app.dependency_overrides[get_session] = _get_session_override
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def admin_user(engine):
    with Session(engine) as session:
        user = User(username="admin", password_hash=hash_password("admin-pass"), role=UserRole.admin)
        session.add(user)
        session.commit()
        session.refresh(user)
        return user


@pytest.fixture()
def admin_client(client, admin_user):
    """Client ja logado como admin (cookie de sessao setado)."""
    resp = client.post("/api/auth/login", json={"username": "admin", "password": "admin-pass"})
    assert resp.status_code == 200
    return client
