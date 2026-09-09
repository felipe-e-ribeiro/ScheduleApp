from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://app:app@localhost:5432/scheduleapp"
    timezone: str = "America/Sao_Paulo"

    telegram_bot_token: str = ""
    telegram_chat_id: str = ""

    secret_key: str = "change-me"
    admin_username: str = "admin"
    admin_password: str = "change-me"

    frontend_base_url: str = "http://localhost:5173"

    confirm_token_max_age_seconds: int = 60 * 60 * 24 * 3  # 3 dias
    admin_session_max_age_seconds: int = 60 * 60 * 24 * 30  # 30 dias


settings = Settings()
