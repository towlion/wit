"""recurrence rules

Revision ID: 0020
Revises: 0019
Create Date: 2026-03-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0020"
down_revision = "0019"
branch_labels = None
depends_on = None

recurrence_frequency = sa.Enum("daily", "weekly", "monthly", name="recurrence_frequency")


def upgrade() -> None:
    op.create_table(
        "recurrence_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("frequency", recurrence_frequency, nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("day_of_month", sa.Integer(), nullable=True),
        sa.Column("next_run_at", sa.Date(), nullable=False),
        sa.Column("enabled", sa.Boolean(), default=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        "ix_recurrence_rules_next_run", "recurrence_rules", ["enabled", "next_run_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_recurrence_rules_next_run", table_name="recurrence_rules")
    op.drop_table("recurrence_rules")
    recurrence_frequency.drop(op.get_bind(), checkfirst=True)
