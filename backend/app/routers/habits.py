from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.auth import get_current_user
from app.db import get_session
from app.models import Habit, HabitType, User
from app.schemas import HabitCreate, HabitRead, HabitUpdate

router = APIRouter(prefix="/api/habits", tags=["habits"])


def _get_own_habit(habit_id: int, user: User, session: Session) -> Habit:
    habit = session.get(Habit, habit_id)
    if not habit or habit.user_id != user.id:
        raise HTTPException(status_code=404, detail="Habit nao encontrado")
    return habit


@router.get("", response_model=list[HabitRead])
def list_habits(
    type: HabitType | None = Query(default=None),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    stmt = select(Habit).where(Habit.user_id == user.id).order_by(Habit.id)
    if type is not None:
        stmt = stmt.where(Habit.type == type)
    return session.exec(stmt).all()


@router.post("", response_model=HabitRead)
def create_habit(payload: HabitCreate, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    habit = Habit(**payload.model_dump(), user_id=user.id)
    session.add(habit)
    session.commit()
    session.refresh(habit)
    return habit


@router.patch("/{habit_id}", response_model=HabitRead)
def update_habit(
    habit_id: int,
    payload: HabitUpdate,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_session),
):
    habit = _get_own_habit(habit_id, user, session)

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(habit, key, value)

    session.add(habit)
    session.commit()
    session.refresh(habit)
    return habit


@router.delete("/{habit_id}")
def delete_habit(habit_id: int, user: User = Depends(get_current_user), session: Session = Depends(get_session)):
    """Soft-delete: desativa o habit, mas preserva o historico de occurrences."""
    habit = _get_own_habit(habit_id, user, session)

    habit.active = False
    session.add(habit)
    session.commit()
    return {"ok": True}
