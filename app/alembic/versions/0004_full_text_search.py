"""full text search

Revision ID: 0004
Revises: 0003
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "ALTER TABLE work_items ADD COLUMN search_vector tsvector "
        "GENERATED ALWAYS AS ("
        "setweight(to_tsvector('english', coalesce(title, '')), 'A') || "
        "setweight(to_tsvector('english', coalesce(description, '')), 'B')"
        ") STORED"
    )
    op.execute(
        "CREATE INDEX ix_work_items_search ON work_items USING GIN (search_vector)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_work_items_search")
    op.drop_column("work_items", "search_vector")
