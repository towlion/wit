"""sprints

Revision ID: 0021
Revises: 0020
Create Date: 2026-03-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0021"
down_revision = "0020"
branch_labels = None
depends_on = None

sprint_status = sa.Enum("planning", "active", "completed", name="sprint_status")


def upgrade() -> None:
    op.create_table(
        "sprints",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("status", sprint_status, nullable=False, server_default="planning"),
        sa.Column("goal", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint("end_date >= start_date", name="ck_sprint_date_range"),
    )
    op.create_index("ix_sprints_project_status", "sprints", ["project_id", "status"])
    op.add_column("work_items", sa.Column("sprint_id", sa.Integer(), sa.ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True))
    op.create_index("ix_work_items_sprint_id", "work_items", ["sprint_id"])


def downgrade() -> None:
    op.drop_index("ix_work_items_sprint_id", table_name="work_items")
    op.drop_column("work_items", "sprint_id")
    op.drop_index("ix_sprints_project_status", table_name="sprints")
    op.drop_table("sprints")
    sprint_status.drop(op.get_bind(), checkfirst=True)
