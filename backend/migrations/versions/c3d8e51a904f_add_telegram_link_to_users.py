"""add telegram link fields to users

Revision ID: c3d8e51a904f
Revises: a1f3c9d02b77
Create Date: 2026-09-13 16:00:00.000000

Vinculo do Telegram por usuario (DM, chat privado -- ver spec
2026-09-13-pulse-telegram-por-usuario-design.md). `telegram_chat_id` e'
unico: um chat do Telegram so' pode estar vinculado a UMA conta do pulse.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = 'c3d8e51a904f'
down_revision: Union[str, None] = 'a1f3c9d02b77'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('telegram_chat_id', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('users', sa.Column('pending_telegram_code', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('users', sa.Column('pending_telegram_code_expires_at', sa.DateTime(), nullable=True))
    op.create_index(op.f('ix_users_telegram_chat_id'), 'users', ['telegram_chat_id'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_users_telegram_chat_id'), table_name='users')
    op.drop_column('users', 'pending_telegram_code_expires_at')
    op.drop_column('users', 'pending_telegram_code')
    op.drop_column('users', 'telegram_chat_id')
