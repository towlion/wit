"""email notifications

Revision ID: 0018
Revises: 0017
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("email_notifications", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "users",
        sa.Column("email_digest_mode", sa.String(20), nullable=False, server_default="immediate"),
    )
    op.create_table(
        "email_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "work_item_id",
            sa.Integer(),
            sa.ForeignKey("work_items.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column(
            "sent_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("email_log")
    op.drop_column("users", "email_digest_mode")
    op.drop_column("users", "email_notifications")
