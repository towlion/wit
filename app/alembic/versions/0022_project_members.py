"""project members

Revision ID: 0022
Revises: 0021
Create Date: 2026-03-17
"""

import sqlalchemy as sa
from alembic import op

revision = "0022"
down_revision = "0021"
branch_labels = None
depends_on = None

project_role = sa.Enum("viewer", "editor", "admin", name="project_role")


def upgrade() -> None:
    project_role.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "project_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", project_role, nullable=False, server_default="editor"),
        sa.UniqueConstraint("project_id", "user_id"),
    )
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_project_members_user_id", table_name="project_members")
    op.drop_table("project_members")
    project_role.drop(op.get_bind(), checkfirst=True)
