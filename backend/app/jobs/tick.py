"""
Job executado pelo K8s CronJob (em producao) a cada N minutos:

    python -m app.jobs.tick

Idempotente: pode rodar quantas vezes for preciso sem duplicar occurrences
nem reenviar notificacao fora do intervalo de retry configurado.
"""

from datetime import date, datetime
from zoneinfo import ZoneInfo

from sqlmodel import Session, select

from app.auth import make_confirm_token
from app.config import settings
from app.db import engine
from app.models import Habit, Occurrence, OccurrenceStatus
from app.telegram import send_message

TZ = ZoneInfo(settings.timezone)

# Convencao deste modulo: todo datetime salvo em Occurrence (scheduled_at,
# last_notified_at) e "naive" (sem tzinfo) e representa hora local de
# settings.timezone -- nunca misturar com datetimes aware nessas comparacoes.


def _now_naive() -> datetime:
    return datetime.now(TZ).replace(tzinfo=None)


def _today_local() -> date:
    return _now_naive().date()


def generate_todays_occurrences(session: Session) -> None:
    today = _today_local()
    weekday = today.weekday()  # 0=segunda .. 6=domingo

    habits = session.exec(select(Habit).where(Habit.active.is_(True))).all()
    for habit in habits:
        if habit.days_of_week is not None and weekday not in habit.days_of_week:
            continue

        for time_str in habit.times:
            hour, minute = (int(part) for part in time_str.split(":"))
            scheduled_at = datetime(today.year, today.month, today.day, hour, minute)

            exists = session.exec(
                select(Occurrence).where(
                    Occurrence.habit_id == habit.id,
                    Occurrence.scheduled_at == scheduled_at,
                )
            ).first()
            if exists:
                continue

            session.add(Occurrence(habit_id=habit.id, scheduled_at=scheduled_at))

    session.commit()


def _notify(session: Session, habit: Habit, occ: Occurrence) -> None:
    token = make_confirm_token(occ.id)
    link = f"{settings.frontend_base_url}/confirm?occurrence={occ.id}&token={token}"
    verb = "Hora de" if occ.notify_count == 0 else "Ainda pendente:"
    text = f"{verb} <b>{habit.name}</b> ({occ.scheduled_at.strftime('%d/%m %H:%M')})\n{link}"

    send_message(text)

    occ.notify_count += 1
    occ.last_notified_at = _now_naive()
    occ.status = OccurrenceStatus.notified
    session.add(occ)


def notify_and_retry(session: Session) -> None:
    now = _now_naive()
    habits_by_id = {h.id: h for h in session.exec(select(Habit)).all()}

    due = session.exec(
        select(Occurrence).where(
            Occurrence.status == OccurrenceStatus.pending,
            Occurrence.scheduled_at <= now,
        )
    ).all()
    for occ in due:
        habit = habits_by_id.get(occ.habit_id)
        if habit and habit.active:
            _notify(session, habit, occ)

    awaiting_retry = session.exec(select(Occurrence).where(Occurrence.status == OccurrenceStatus.notified)).all()
    for occ in awaiting_retry:
        habit = habits_by_id.get(occ.habit_id)
        if not habit or not habit.active or not occ.last_notified_at:
            continue
        if occ.notify_count >= habit.max_retries:
            continue

        elapsed_min = (now - occ.last_notified_at).total_seconds() / 60
        if elapsed_min >= habit.retry_interval_min:
            _notify(session, habit, occ)

    session.commit()


def close_missed(session: Session) -> None:
    today = _today_local()
    today_start = datetime(today.year, today.month, today.day)

    stale = session.exec(
        select(Occurrence).where(
            Occurrence.status.in_([OccurrenceStatus.pending, OccurrenceStatus.notified]),
            Occurrence.scheduled_at < today_start,
        )
    ).all()
    for occ in stale:
        occ.status = OccurrenceStatus.missed
        session.add(occ)

    session.commit()


def run() -> None:
    with Session(engine) as session:
        generate_todays_occurrences(session)
        notify_and_retry(session)
        close_missed(session)


if __name__ == "__main__":
    run()
