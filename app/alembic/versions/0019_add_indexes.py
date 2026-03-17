"""add performance indexes

Revision ID: 0019
Revises: 0018
Create Date: 2026-03-17
"""

from alembic import op

revision = "0019"
down_revision = "0018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_work_item_deps_blocked", "work_item_dependencies", ["blocked_item_id"]
    )
    op.create_index(
        "ix_subtasks_item_completed", "subtasks", ["work_item_id", "completed"]
    )


def downgrade() -> None:
    op.drop_index("ix_subtasks_item_completed", table_name="subtasks")
    op.drop_index("ix_work_item_deps_blocked", table_name="work_item_dependencies")
