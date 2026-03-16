"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-03-16
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "workspaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    workspace_role = sa.Enum("owner", "admin", "member", "guest", name="workspace_role")
    op.create_table(
        "workspace_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", workspace_role, nullable=False, server_default="member"),
        sa.UniqueConstraint("workspace_id", "user_id"),
    )
    op.create_index("ix_workspace_members_user_id", "workspace_members", ["user_id"])

    project_template = sa.Enum("software", "home", "event", name="project_template")
    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("template", project_template, nullable=False, server_default="software"),
        sa.Column("item_counter", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("workspace_id", "slug"),
    )

    state_category = sa.Enum("todo", "in_progress", "done", name="state_category")
    op.create_table(
        "workflow_states",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("category", state_category, nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("color", sa.String(7), nullable=False, server_default="#6b7280"),
    )

    op.create_table(
        "labels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#6b7280"),
        sa.UniqueConstraint("project_id", "name"),
    )

    item_priority = sa.Enum("low", "medium", "high", "urgent", name="item_priority")
    op.create_table(
        "work_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("item_number", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("description", sa.Text()),
        sa.Column("status_id", sa.Integer(), sa.ForeignKey("workflow_states.id"), nullable=False),
        sa.Column("priority", item_priority, nullable=False, server_default="medium"),
        sa.Column("position", sa.String(255), nullable=False, server_default="a0"),
        sa.Column("archived", sa.Boolean(), server_default="false"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "item_number"),
    )
    op.create_index("ix_work_items_board", "work_items", ["project_id", "status_id", "position"])

    op.create_table(
        "work_item_assignees",
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )

    op.create_table(
        "work_item_labels",
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("label_id", sa.Integer(), sa.ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
    )


def downgrade() -> None:
    op.drop_table("work_item_labels")
    op.drop_table("work_item_assignees")
    op.drop_index("ix_work_items_board", table_name="work_items")
    op.drop_table("work_items")
    op.drop_table("labels")
    op.drop_table("workflow_states")
    op.drop_table("projects")
    op.drop_index("ix_workspace_members_user_id", table_name="workspace_members")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
    op.drop_table("users")

    sa.Enum(name="item_priority").drop(op.get_bind())
    sa.Enum(name="state_category").drop(op.get_bind())
    sa.Enum(name="project_template").drop(op.get_bind())
    sa.Enum(name="workspace_role").drop(op.get_bind())
