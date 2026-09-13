"""Garante que o banco de dados alvo exista antes de conectar nele.

Usado quando o Postgres é compartilhado com outro app (ex: a instância do
comprasweb-prod) -- o usuário/senha em DATABASE_URL é o mesmo usuário
"bootstrap" daquela instância (criado via POSTGRES_USER na inicialização
do container Postgres), que por padrão tem privilégio pra criar bancos
novos ali dentro. Conecta na base de manutenção "postgres" (sempre
existe) só pra checar/criar o banco alvo -- nunca roda dentro de uma
transação (CREATE DATABASE não é permitido dentro de uma).
"""

from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url


def ensure_database_exists(database_url: str) -> None:
    url = make_url(database_url)
    target_db = url.database
    maintenance_url = url.set(database="postgres")

    engine = create_engine(maintenance_url, isolation_level="AUTOCOMMIT")
    try:
        with engine.connect() as conn:
            exists = conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": target_db},
            ).scalar()
            if not exists:
                # Nome do banco não aceita bind parameter -- vem de
                # DATABASE_URL (configuração nossa, não input de usuário).
                conn.execute(text(f'CREATE DATABASE "{target_db}"'))
    finally:
        engine.dispose()
