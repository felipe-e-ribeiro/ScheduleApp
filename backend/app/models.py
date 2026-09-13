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


class UserRole(str, enum.Enum):
    admin = "admin"
    user = "user"


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.user)
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Vinculo com o Telegram (DM, chat privado -- nunca grupo). Unico:
    # um chat do Telegram so' pode estar vinculado a UMA conta do pulse.
    telegram_chat_id: str | None = Field(default=None, unique=True, index=True)

    # Codigo de vinculo pendente (fluxo /start <codigo> no bot) -- so'
    # existe UM por vez, gerar de novo sobrescreve o anterior. Sem tabela
    # separada, e' estado transiente de um unico usuario.
    pending_telegram_code: str | None = Field(default=None)
    pending_telegram_code_expires_at: datetime | None = Field(default=None)


class Invite(SQLModel, table=True):
    __tablename__ = "invites"

    id: int | None = Field(default=None, primary_key=True)

    # Guarda so' o hash do token que vai na URL -- e' uma credencial (quem
    # tiver o link cria uma conta), mesma logica de nunca guardar senha em
    # texto puro.
    token_hash: str = Field(unique=True, index=True)

    created_by_id: int = Field(foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime

    used_at: datetime | None = Field(default=None)
    used_by_id: int | None = Field(default=None, foreign_key="users.id")
    revoked_at: datetime | None = Field(default=None)


class Habit(SQLModel, table=True):
    __tablename__ = "habits"

    id: int | None = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    name: str
    type: HabitType = Field(default=HabitType.custom)

    # Horarios fixos no dia, ex: ["08:00", "20:00"]
    times: list[str] = Field(sa_column=Column(JSON))

    # Dias da semana em que o habito se aplica (0=segunda .. 6=domingo).
    # None = todo dia.
    days_of_week: list[int] | None = Field(default=None, sa_column=Column(JSON))

    retry_interval_min: int = Field(default=60)
    max_retries: int = Field(default=3)

    # Trava: nao deixa confirmar uma ocorrencia com mais do que essa
    # quantidade de horas de antecedencia (ex: marcar o remedio das 20h
    # estando ainda de manha). 0 = sem trava.
    early_confirm_guard_hours: int = Field(default=3)

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
