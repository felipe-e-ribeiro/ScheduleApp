from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.auth import read_confirm_token, require_admin
from app.config import settings
from app.db import get_session
from app.models import Habit, Occurrence, OccurrenceStatus

router = APIRouter(prefix="/api/occurrences", tags=["occurrences"])

TZ = ZoneInfo(settings.timezone)


def _load_occurrence_by_token(occurrence: int, token: str, session: Session) -> Occurrence:
    occurrence_id = read_confirm_token(token)
    if occurrence_id != occurrence:
        raise HTTPException(status_code=400, detail="Token nao corresponde a ocorrencia")

    occ = session.get(Occurrence, occurrence_id)
    if not occ:
        raise HTTPException(status_code=404, detail="Ocorrencia nao encontrada")
    return occ


def _do_confirm(occ: Occurrence, session: Session) -> Occurrence:
    if occ.status != OccurrenceStatus.confirmed:
        occ.status = OccurrenceStatus.confirmed
        # naive, hora local -- mesma convencao de Occurrence.scheduled_at (ver tick.py)
        occ.confirmed_at = datetime.now(TZ).replace(tzinfo=None)
        session.add(occ)
        session.commit()
        session.refresh(occ)
    return occ


def _do_unconfirm(occ: Occurrence, session: Session) -> Occurrence:
    """Desfaz uma confirmacao feita por engano. Idempotente."""
    if occ.status == OccurrenceStatus.confirmed:
        occ.status = OccurrenceStatus.notified if occ.notify_count > 0 else OccurrenceStatus.pending
        occ.confirmed_at = None
        session.add(occ)
        session.commit()
        session.refresh(occ)
    return occ


# ---------------------------------------------------------------------------
# Fluxo publico via link do Telegram (token assinado, sem login). Quem tem o
# link tem o mesmo "direito" de confirmar OU desfazer -- e a mesma credencial.
# ---------------------------------------------------------------------------


@router.get("/confirm")
def get_confirm_info(occurrence: int, token: str, session: Session = Depends(get_session)):
    """Usado pela pagina de confirmacao pra mostrar o que sera confirmado antes do clique."""
    occ = _load_occurrence_by_token(occurrence, token, session)
    habit = session.get(Habit, occ.habit_id)
    return {
        "occurrence_id": occ.id,
        "habit_id": occ.habit_id,
        "habit_name": habit.name if habit else None,
        "scheduled_at": occ.scheduled_at,
        "status": occ.status,
        "already_confirmed": occ.status == OccurrenceStatus.confirmed,
    }


@router.post("/confirm")
def confirm_occurrence(occurrence: int, token: str, session: Session = Depends(get_session)):
    occ = _load_occurrence_by_token(occurrence, token, session)
    occ = _do_confirm(occ, session)
    return {"ok": True, "confirmed_at": occ.confirmed_at}


@router.post("/unconfirm")
def unconfirm_occurrence(occurrence: int, token: str, session: Session = Depends(get_session)):
    occ = _load_occurrence_by_token(occurrence, token, session)
    occ = _do_unconfirm(occ, session)
    return {"ok": True, "status": occ.status}


# ---------------------------------------------------------------------------
# Fluxo autenticado pelo painel (sessao de admin, sem token) -- pro caso de ja
# ter tomado o remedio/ido treinar sem esperar o Telegram avisar, e pra
# desfazer um clique sem querer.
# ---------------------------------------------------------------------------


@router.get("/today", dependencies=[Depends(require_admin)])
def list_today(session: Session = Depends(get_session)):
    today = datetime.now(TZ).date()
    start = datetime(today.year, today.month, today.day)
    end = datetime(today.year, today.month, today.day, 23, 59, 59)

    occurrences = session.exec(
        select(Occurrence)
        .where(Occurrence.scheduled_at >= start, Occurrence.scheduled_at <= end)
        .order_by(Occurrence.scheduled_at)
    ).all()

    return [
        {
            "id": occ.id,
            "habit_id": occ.habit_id,
            "time": occ.scheduled_at.strftime("%H:%M"),
            "status": occ.status,
        }
        for occ in occurrences
    ]


@router.post("/{occurrence_id}/confirm", dependencies=[Depends(require_admin)])
def confirm_occurrence_admin(occurrence_id: int, session: Session = Depends(get_session)):
    occ = session.get(Occurrence, occurrence_id)
    if not occ:
        raise HTTPException(status_code=404, detail="Ocorrencia nao encontrada")
    occ = _do_confirm(occ, session)
    return {"ok": True, "confirmed_at": occ.confirmed_at}


@router.post("/{occurrence_id}/unconfirm", dependencies=[Depends(require_admin)])
def unconfirm_occurrence_admin(occurrence_id: int, session: Session = Depends(get_session)):
    occ = session.get(Occurrence, occurrence_id)
    if not occ:
        raise HTTPException(status_code=404, detail="Ocorrencia nao encontrada")
    occ = _do_unconfirm(occ, session)
    return {"ok": True, "status": occ.status}
