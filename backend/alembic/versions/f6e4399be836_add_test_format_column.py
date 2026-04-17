"""add_test_format_column

Revision ID: f6e4399be836
Revises: 9cf84eb1036b
Create Date: 2026-04-16 22:59:48.099360
"""
from alembic import op
import sqlalchemy as sa



revision = 'f6e4399be836'
down_revision = '9cf84eb1036b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add column as nullable first
    op.add_column('tests', sa.Column('format', sa.String(length=50), nullable=True))
    
    # 2. Update existing rows to 'full'
    op.execute("UPDATE tests SET format = 'full'")
    
    # 3. Make the column non-nullable and set index
    op.alter_column('tests', 'format', nullable=False)
    op.create_index(op.f('ix_tests_format'), 'tests', ['format'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_tests_format'), table_name='tests')
    op.drop_column('tests', 'format')

