"""due date activity event type

Revision ID: 0023
Revises: 0022
Create Date: 2026-03-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'due_date_change'")


def downgrade() -> None:
    # Cannot remove enum values in PostgreSQL; this is a no-op
    pass
