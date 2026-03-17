"""templates and automation

Revision ID: 0012
Revises: 0011
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "item_templates",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("title_template", sa.String(500), nullable=False, server_default=""),
        sa.Column("description_template", sa.Text(), nullable=True),
        sa.Column("priority", sa.String(50), nullable=False, server_default="medium"),
        sa.Column("label_ids", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "name"),
    )

    op.create_table(
        "automation_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trigger", sa.String(50), nullable=False),
        sa.Column("trigger_state_id", sa.Integer(), sa.ForeignKey("workflow_states.id", ondelete="CASCADE"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("action_config", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_automation_rules_project_trigger", "automation_rules", ["project_id", "trigger"])


def downgrade() -> None:
    op.drop_index("ix_automation_rules_project_trigger", table_name="automation_rules")
    op.drop_table("automation_rules")
    op.drop_table("item_templates")
