"""item dependencies

Revision ID: 0013
Revises: 0012
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "work_item_dependencies",
        sa.Column("blocking_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("blocked_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.CheckConstraint("blocking_item_id != blocked_item_id", name="ck_no_self_dependency"),
    )


def downgrade() -> None:
    op.drop_table("work_item_dependencies")
