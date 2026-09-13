from datetime import timedelta

from sqlmodel import Session, select

from app.jobs.tick import _now_naive, notify_and_retry
from app.models import Habit, Occurrence, OccurrenceStatus, User, UserRole


def _make_user_with_habit(engine, *, username: str, telegram_chat_id: str | None) -> tuple[int, int]:
    with Session(engine) as session:
        user = User(username=username, password_hash="x", role=UserRole.user, telegram_chat_id=telegram_chat_id)
        session.add(user)
        session.commit()
        session.refresh(user)

        habit = Habit(user_id=user.id, name="Remédio", times=["08:00"])
        session.add(habit)
        session.commit()
        session.refresh(habit)

        # Convencao do tick.py: scheduled_at e' naive na hora LOCAL
        # (settings.timezone), nao UTC -- ver `_now_naive` em app/jobs/tick.py.
        occ = Occurrence(
            habit_id=habit.id,
            scheduled_at=_now_naive() - timedelta(minutes=5),
            status=OccurrenceStatus.pending,
        )
        session.add(occ)
        session.commit()

        return user.id, habit.id


def test_notifies_owner_chat_id(engine, monkeypatch):
    sent = []
    monkeypatch.setattr("app.jobs.tick.send_message", lambda chat_id, text: sent.append((chat_id, text)))

    _make_user_with_habit(engine, username="dono", telegram_chat_id="777")

    with Session(engine) as session:
        notify_and_retry(session)

    assert len(sent) == 1
    assert sent[0][0] == "777"


def test_user_without_telegram_link_is_skipped_without_crashing(engine, monkeypatch):
    sent = []
    monkeypatch.setattr("app.jobs.tick.send_message", lambda chat_id, text: sent.append((chat_id, text)))

    user_id, habit_id = _make_user_with_habit(engine, username="sem_vinculo", telegram_chat_id=None)

    with Session(engine) as session:
        notify_and_retry(session)  # nao deve levantar excecao

    assert sent == []
    # ainda assim marca como "tentado" -- senao o job tentaria de novo a
    # cada tick, pra sempre, pra um usuario que nunca vai vincular.
    with Session(engine) as session:
        occ = session.exec(select(Occurrence).where(Occurrence.habit_id == habit_id)).first()
        assert occ.status == OccurrenceStatus.notified
