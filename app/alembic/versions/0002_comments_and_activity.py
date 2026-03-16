"""comments and activity history

Revision ID: 0002
Revises: 0001
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    event_type = sa.Enum(
        "comment",
        "status_change",
        "priority_change",
        "assignee_added",
        "assignee_removed",
        "label_added",
        "label_removed",
        "created",
        "archived",
        name="activity_event_type",
    )
    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "work_item_id",
            sa.Integer(),
            sa.ForeignKey("work_items.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("event_type", event_type, nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("old_value", sa.String(500), nullable=True),
        sa.Column("new_value", sa.String(500), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )
    op.create_index(
        "ix_activity_events_item_created",
        "activity_events",
        ["work_item_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_activity_events_item_created", table_name="activity_events")
    op.drop_table("activity_events")
    sa.Enum(name="activity_event_type").drop(op.get_bind())
