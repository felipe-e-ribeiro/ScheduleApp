from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://app:app@localhost:5432/scheduleapp"
    timezone: str = "America/Sao_Paulo"

    telegram_bot_token: str = ""

    # Compartilhado com quem chama o webhook do Telegram (setWebhook usa o
    # mesmo valor como secret_token) -- garante que so' o Telegram consegue
    # chamar POST /api/telegram/webhook.
    telegram_webhook_secret: str = "change-me"

    secret_key: str = "change-me"

    # So' usados como seed do admin bootstrap (migration cria a linha em
    # `users` a partir daqui) -- depois disso, login sempre busca o usuario
    # real no banco, essas vars nao autenticam mais nada diretamente.
    admin_username: str = "admin"
    admin_password: str = "change-me"

    frontend_base_url: str = "http://localhost:5173"

    confirm_token_max_age_seconds: int = 60 * 60 * 24 * 3  # 3 dias
    session_max_age_seconds: int = 60 * 60 * 24 * 30  # 30 dias
    invite_max_age_seconds: int = 60 * 60  # 1 hora
    telegram_link_code_max_age_seconds: int = 60 * 10  # 10 minutos


settings = Settings()
