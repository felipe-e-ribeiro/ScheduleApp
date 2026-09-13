from datetime import datetime, timedelta

from sqlmodel import Session, select

from app.config import settings
from app.models import User


def _set_pending_code(engine, user_id: int, code: str, expires_in_minutes: int = 10) -> None:
    with Session(engine) as session:
        user = session.get(User, user_id)
        user.pending_telegram_code = code
        user.pending_telegram_code_expires_at = datetime.utcnow() + timedelta(minutes=expires_in_minutes)
        session.add(user)
        session.commit()


def _webhook_update(chat_id: int, text: str) -> dict:
    return {"message": {"chat": {"id": chat_id}, "text": text}}


def test_valid_code_links_chat_id(client, admin_user, engine, monkeypatch):
    sent = []
    monkeypatch.setattr("app.routers.telegram_webhook.send_message", lambda chat_id, text: sent.append((chat_id, text)))
    monkeypatch.setattr(settings, "telegram_webhook_secret", "test-secret")

    _set_pending_code(engine, admin_user.id, "ABC123")

    resp = client.post(
        "/api/telegram/webhook",
        json=_webhook_update(555, "/start ABC123"),
        headers={"X-Telegram-Bot-Api-Secret-Token": "test-secret"},
    )
    assert resp.status_code == 200

    with Session(engine) as session:
        user = session.get(User, admin_user.id)
        assert user.telegram_chat_id == "555"
        assert user.pending_telegram_code is None
    assert len(sent) == 1
    assert sent[0][0] == "555"


def test_expired_code_does_not_link(client, admin_user, engine, monkeypatch):
    sent = []
    monkeypatch.setattr("app.routers.telegram_webhook.send_message", lambda chat_id, text: sent.append((chat_id, text)))
    monkeypatch.setattr(settings, "telegram_webhook_secret", "test-secret")

    _set_pending_code(engine, admin_user.id, "OLD999", expires_in_minutes=-1)

    resp = client.post(
        "/api/telegram/webhook",
        json=_webhook_update(555, "/start OLD999"),
        headers={"X-Telegram-Bot-Api-Secret-Token": "test-secret"},
    )
    assert resp.status_code == 200

    with Session(engine) as session:
        user = session.get(User, admin_user.id)
        assert user.telegram_chat_id is None
    assert "inválido ou expirado" in sent[0][1]


def test_chat_id_already_linked_to_another_user_is_rejected(client, admin_user, engine, monkeypatch):
    sent = []
    monkeypatch.setattr("app.routers.telegram_webhook.send_message", lambda chat_id, text: sent.append((chat_id, text)))
    monkeypatch.setattr(settings, "telegram_webhook_secret", "test-secret")

    with Session(engine) as session:
        other = User(username="outro", password_hash="x", telegram_chat_id="999")
        session.add(other)
        session.commit()

    _set_pending_code(engine, admin_user.id, "DEF456")

    resp = client.post(
        "/api/telegram/webhook",
        json=_webhook_update(999, "/start DEF456"),
        headers={"X-Telegram-Bot-Api-Secret-Token": "test-secret"},
    )
    assert resp.status_code == 200

    with Session(engine) as session:
        user = session.get(User, admin_user.id)
        assert user.telegram_chat_id is None
    assert "já está vinculado a outra conta" in sent[0][1]


def test_wrong_secret_header_has_no_effect(client, admin_user, engine, monkeypatch):
    sent = []
    monkeypatch.setattr("app.routers.telegram_webhook.send_message", lambda chat_id, text: sent.append((chat_id, text)))
    monkeypatch.setattr(settings, "telegram_webhook_secret", "test-secret")

    _set_pending_code(engine, admin_user.id, "GHI789")

    resp = client.post(
        "/api/telegram/webhook",
        json=_webhook_update(555, "/start GHI789"),
        headers={"X-Telegram-Bot-Api-Secret-Token": "wrong-secret"},
    )
    assert resp.status_code == 200

    with Session(engine) as session:
        user = session.get(User, admin_user.id)
        assert user.telegram_chat_id is None
    assert sent == []


def test_habit_creation_blocked_until_telegram_linked(admin_client, admin_user, engine):
    resp = admin_client.post(
        "/api/habits", json={"name": "Remédio", "type": "custom", "times": ["08:00"], "days_of_week": None}
    )
    assert resp.status_code == 400
    assert "Vincule seu Telegram" in resp.json()["detail"]

    with Session(engine) as session:
        user = session.get(User, admin_user.id)
        user.telegram_chat_id = "123"
        session.add(user)
        session.commit()

    resp = admin_client.post(
        "/api/habits", json={"name": "Remédio", "type": "custom", "times": ["08:00"], "days_of_week": None}
    )
    assert resp.status_code == 200
