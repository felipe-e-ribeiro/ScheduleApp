"""add users, invites, habits.user_id

Revision ID: a1f3c9d02b77
Revises: 57cb21625dd0
Create Date: 2026-09-13 14:00:00.000000

Cria o sistema de usuarios (antes disso o pulse era single-tenant, admin
hardcoded via ADMIN_USERNAME/ADMIN_PASSWORD sem hash). Faz 3 coisas:

1. Cria `users` e `invites`.
2. Insere o admin bootstrap a partir de ADMIN_USERNAME/ADMIN_PASSWORD (senha
   ja' em hash bcrypt) -- unico jeito de nao perder o acesso que ja existe.
3. Adiciona `habits.user_id`, faz backfill de tudo que ja existia pra essa
   conta admin, so' depois marca a coluna como NOT NULL.
"""
from typing import Sequence, Union

import bcrypt
from alembic import op
import sqlalchemy as sa
import sqlmodel

from app.config import settings

# revision identifiers, used by Alembic.
revision: str = 'a1f3c9d02b77'
down_revision: Union[str, None] = '57cb21625dd0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('username', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('password_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('role', sa.Enum('admin', 'user', name='userrole'), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)

    op.create_table(
        'invites',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('token_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_by_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used_at', sa.DateTime(), nullable=True),
        sa.Column('used_by_id', sa.Integer(), nullable=True),
        sa.Column('revoked_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['created_by_id'], ['users.id']),
        sa.ForeignKeyConstraint(['used_by_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_invites_token_hash'), 'invites', ['token_hash'], unique=True)

    # habits.user_id nullable primeiro -- ainda nao da' pra exigir NOT NULL
    # porque ja existem linhas sem dono.
    op.add_column('habits', sa.Column('user_id', sa.Integer(), nullable=True))

    # --- bootstrap do admin + backfill ---------------------------------
    conn = op.get_bind()
    password_hash = bcrypt.hashpw(settings.admin_password.encode(), bcrypt.gensalt()).decode()

    users_table = sa.table(
        'users',
        sa.column('id', sa.Integer),
        sa.column('username', sa.String),
        sa.column('password_hash', sa.String),
        sa.column('role', sa.Enum('admin', 'user', name='userrole')),
        sa.column('active', sa.Boolean),
        sa.column('created_at', sa.DateTime),
    )
    result = conn.execute(
        users_table.insert().values(
            username=settings.admin_username,
            password_hash=password_hash,
            role='admin',
            active=True,
            created_at=sa.func.now(),
        ).returning(users_table.c.id)
    )
    admin_id = result.scalar_one()

    op.execute(sa.text("UPDATE habits SET user_id = :admin_id WHERE user_id IS NULL").bindparams(admin_id=admin_id))

    op.alter_column('habits', 'user_id', nullable=False)
    op.create_index(op.f('ix_habits_user_id'), 'habits', ['user_id'], unique=False)
    op.create_foreign_key('fk_habits_user_id_users', 'habits', 'users', ['user_id'], ['id'])


def downgrade() -> None:
    op.drop_constraint('fk_habits_user_id_users', 'habits', type_='foreignkey')
    op.drop_index(op.f('ix_habits_user_id'), table_name='habits')
    op.drop_column('habits', 'user_id')

    op.drop_index(op.f('ix_invites_token_hash'), table_name='invites')
    op.drop_table('invites')

    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_table('users')

    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)
