"""add story_points to work_items

Revision ID: 0024
Revises: 0023
Create Date: 2026-03-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("work_items", sa.Column("story_points", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("work_items", "story_points")
