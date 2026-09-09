import enum
from datetime import datetime

from sqlalchemy import UniqueConstraint
from sqlmodel import JSON, Column, Field, SQLModel


class HabitType(str, enum.Enum):
    medication = "medication"
    gym = "gym"
    custom = "custom"


class OccurrenceStatus(str, enum.Enum):
    pending = "pending"
    notified = "notified"
    confirmed = "confirmed"
    missed = "missed"


class Habit(SQLModel, table=True):
    __tablename__ = "habits"

    id: int | None = Field(default=None, primary_key=True)
    name: str
    type: HabitType = Field(default=HabitType.custom)

    # Horarios fixos no dia, ex: ["08:00", "20:00"]
    times: list[str] = Field(sa_column=Column(JSON))

    # Dias da semana em que o habito se aplica (0=segunda .. 6=domingo).
    # None = todo dia.
    days_of_week: list[int] | None = Field(default=None, sa_column=Column(JSON))

    retry_interval_min: int = Field(default=60)
    max_retries: int = Field(default=3)

    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Occurrence(SQLModel, table=True):
    __tablename__ = "occurrences"
    __table_args__ = (UniqueConstraint("habit_id", "scheduled_at", name="uq_habit_scheduled_at"),)

    id: int | None = Field(default=None, primary_key=True)
    habit_id: int = Field(foreign_key="habits.id", index=True)
    scheduled_at: datetime = Field(index=True)

    status: OccurrenceStatus = Field(default=OccurrenceStatus.pending, index=True)
    notify_count: int = Field(default=0)
    last_notified_at: datetime | None = Field(default=None)
    confirmed_at: datetime | None = Field(default=None)
