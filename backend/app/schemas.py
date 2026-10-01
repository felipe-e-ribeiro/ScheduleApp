from datetime import datetime

from pydantic import BaseModel, Field, field_validator

from app.models import HabitType, UserRole


class HabitCreate(BaseModel):
    name: str
    type: HabitType = HabitType.custom
    times: list[str]
    days_of_week: list[int] | None = None
    retry_interval_min: int = 60
    max_retries: int = 3
    early_confirm_guard_hours: int = 3


class HabitUpdate(BaseModel):
    name: str | None = None
    type: HabitType | None = None
    times: list[str] | None = None
    days_of_week: list[int] | None = None
    retry_interval_min: int | None = None
    max_retries: int | None = None
    early_confirm_guard_hours: int | None = None
    active: bool | None = None


class HabitRead(BaseModel):
    id: int
    name: str
    type: HabitType
    times: list[str]
    days_of_week: list[int] | None
    retry_interval_min: int
    max_retries: int
    early_confirm_guard_hours: int
    active: bool


# ---------------------------------------------------------------------------
# usuarios / convites
# ---------------------------------------------------------------------------


USERNAME_MIN_LENGTH = 3
PASSWORD_MIN_LENGTH = 8


class RegisterRequest(BaseModel):
    token: str
    username: str
    password: str = Field(min_length=PASSWORD_MIN_LENGTH)

    @field_validator("username")
    @classmethod
    def _username_valid(cls, v: str) -> str:
        # strip antes de medir -- "   " ou " ab " nao podem virar conta
        v = v.strip()
        if len(v) < USERNAME_MIN_LENGTH:
            raise ValueError(f"Usuário precisa ter pelo menos {USERNAME_MIN_LENGTH} caracteres")
        return v

    @field_validator("password")
    @classmethod
    def _password_has_letters_and_digits(cls, v: str) -> str:
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Senha precisa ter letras e números")
        return v


class UserRead(BaseModel):
    id: int
    username: str
    role: UserRole
    active: bool
    created_at: datetime


class UserUpdate(BaseModel):
    active: bool


class InviteRead(BaseModel):
    id: int
    invite_url: str
    expires_at: datetime
    used_at: datetime | None
    revoked_at: datetime | None


# ---------------------------------------------------------------------------
# telegram (vinculo por usuario)
# ---------------------------------------------------------------------------


class TelegramLinkCodeRead(BaseModel):
    code: str
    deep_link: str
    expires_at: datetime
