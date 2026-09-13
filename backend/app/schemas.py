from datetime import datetime

from pydantic import BaseModel

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


class RegisterRequest(BaseModel):
    token: str
    username: str
    password: str


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
