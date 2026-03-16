"""custom fields

Revision ID: 0005
Revises: 0004
Create Date: 2026-03-17
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    field_type = sa.Enum("text", "number", "date", "select", "checkbox", name="custom_field_type")
    op.create_table(
        "custom_field_definitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("field_type", field_type, nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("required", sa.Boolean(), server_default="false"),
        sa.Column("position", sa.Integer(), server_default="0"),
        sa.UniqueConstraint("project_id", "name"),
    )

    op.create_table(
        "custom_field_values",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("field_id", sa.Integer(), sa.ForeignKey("custom_field_definitions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("value_text", sa.Text(), nullable=True),
        sa.Column("value_number", sa.Float(), nullable=True),
        sa.Column("value_date", sa.Date(), nullable=True),
        sa.UniqueConstraint("work_item_id", "field_id"),
    )


def downgrade() -> None:
    op.drop_table("custom_field_values")
    op.drop_table("custom_field_definitions")
    sa.Enum(name="custom_field_type").drop(op.get_bind())
