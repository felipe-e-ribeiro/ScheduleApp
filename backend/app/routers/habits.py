from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import require_admin
from app.db import get_session
from app.models import Habit, HabitType
from app.schemas import HabitCreate, HabitRead, HabitUpdate

router = APIRouter(prefix="/api/habits", tags=["habits"], dependencies=[Depends(require_admin)])


@router.get("", response_model=list[HabitRead])
def list_habits(type: HabitType | None = Query(default=None), session: Session = Depends(get_session)):
    stmt = select(Habit).order_by(Habit.id)
    if type is not None:
        stmt = stmt.where(Habit.type == type)
    return session.exec(stmt).all()


@router.post("", response_model=HabitRead)
def create_habit(payload: HabitCreate, session: Session = Depends(get_session)):
    habit = Habit(**payload.model_dump())
    session.add(habit)
    session.commit()
    session.refresh(habit)
    return habit


@router.patch("/{habit_id}", response_model=HabitRead)
def update_habit(habit_id: int, payload: HabitUpdate, session: Session = Depends(get_session)):
    habit = session.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit nao encontrado")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(habit, key, value)

    session.add(habit)
    session.commit()
    session.refresh(habit)
    return habit


@router.delete("/{habit_id}")
def delete_habit(habit_id: int, session: Session = Depends(get_session)):
    """Soft-delete: desativa o habit, mas preserva o historico de occurrences."""
    habit = session.get(Habit, habit_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit nao encontrado")

    habit.active = False
    session.add(habit)
    session.commit()
    return {"ok": True}
