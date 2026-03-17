"""subtasks

Revision ID: 0017
Revises: 0016
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "subtasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "work_item_id",
            sa.Integer(),
            sa.ForeignKey("work_items.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("completed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.execute("ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'subtask_added'")
    op.execute("ALTER TYPE activity_event_type ADD VALUE IF NOT EXISTS 'subtask_completed'")


def downgrade() -> None:
    op.drop_table("subtasks")
