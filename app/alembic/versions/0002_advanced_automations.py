"""advanced automations — trigger_config + automation_log

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("automation_rules", sa.Column("trigger_config", sa.JSON(), nullable=True))

    op.create_table(
        "automation_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("rule_id", sa.Integer(), sa.ForeignKey("automation_rules.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("fired_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("rule_id", "work_item_id"),
    )


def downgrade() -> None:
    op.drop_table("automation_log")
    op.drop_column("automation_rules", "trigger_config")
