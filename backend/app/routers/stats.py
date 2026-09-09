from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlmodel import Session, select

from app.auth import require_admin
from app.config import settings
from app.db import get_session
from app.models import Occurrence, OccurrenceStatus

router = APIRouter(prefix="/api/stats", tags=["stats"], dependencies=[Depends(require_admin)])

TZ = ZoneInfo(settings.timezone)


@router.get("/habits/{habit_id}")
def habit_stats(habit_id: int, days: int = Query(default=30, le=365), session: Session = Depends(get_session)):
    # naive, hora local -- mesma convencao de Occurrence.scheduled_at (ver tick.py)
    since = datetime.now(TZ).replace(tzinfo=None) - timedelta(days=days)
    occurrences = session.exec(
        select(Occurrence)
        .where(Occurrence.habit_id == habit_id, Occurrence.scheduled_at >= since)
        .order_by(Occurrence.scheduled_at)
    ).all()

    total = len(occurrences)
    confirmed = sum(1 for o in occurrences if o.status == OccurrenceStatus.confirmed)
    missed = sum(1 for o in occurrences if o.status == OccurrenceStatus.missed)
    pending = total - confirmed - missed

    # Streak atual: conta ocorrencias confirmadas consecutivas do mais recente pro mais antigo.
    # "pending"/"notified" nao quebram a streak (ainda em aberto), "missed" quebra.
    streak = 0
    for occ in sorted(occurrences, key=lambda o: o.scheduled_at, reverse=True):
        if occ.status == OccurrenceStatus.confirmed:
            streak += 1
        elif occ.status == OccurrenceStatus.missed:
            break

    return {
        "habit_id": habit_id,
        "total": total,
        "confirmed": confirmed,
        "missed": missed,
        "pending": pending,
        "adherence_pct": round((confirmed / total) * 100, 1) if total else None,
        "current_streak": streak,
        "history": [
            {"scheduled_at": o.scheduled_at, "status": o.status, "confirmed_at": o.confirmed_at}
            for o in occurrences
        ],
    }
