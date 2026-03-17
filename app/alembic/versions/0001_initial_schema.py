"""initial schema (squashed from 0001-0024)

Revision ID: 0001
Revises:
Create Date: 2026-03-18
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- users (no FKs) ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False),
        sa.Column("display_name", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("is_superuser", sa.Boolean(), server_default="false"),
        sa.Column("is_active", sa.Boolean(), server_default="true"),
        sa.Column("theme", sa.String(10), nullable=True),
        sa.Column("email_notifications", sa.Boolean(), server_default="false"),
        sa.Column("email_digest_mode", sa.String(20), server_default="immediate"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- workspaces (no FKs) ---
    op.create_table(
        "workspaces",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- workspace_members ---
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

    # --- projects ---
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
        sa.Column("board_settings", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("workspace_id", "slug"),
    )

    # --- workflow_states ---
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

    # --- labels ---
    op.create_table(
        "labels",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#6b7280"),
        sa.UniqueConstraint("project_id", "name"),
    )

    # --- sprints ---
    sprint_status = sa.Enum("planning", "active", "completed", name="sprint_status")
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

    # --- work_items ---
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
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("story_points", sa.Integer(), nullable=True),
        sa.Column("sprint_id", sa.Integer(), sa.ForeignKey("sprints.id", ondelete="SET NULL"), nullable=True),
        sa.Column("archived", sa.Boolean(), server_default="false"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "item_number"),
    )
    op.create_index("ix_work_items_board", "work_items", ["project_id", "status_id", "position"])
    op.create_index("ix_work_items_sprint_id", "work_items", ["sprint_id"])

    # search_vector: generated tsvector column (raw SQL — not supported by SA)
    op.execute(
        "ALTER TABLE work_items ADD COLUMN search_vector tsvector "
        "GENERATED ALWAYS AS ("
        "setweight(to_tsvector('english', coalesce(title, '')), 'A') || "
        "setweight(to_tsvector('english', coalesce(description, '')), 'B')"
        ") STORED"
    )
    op.execute(
        "CREATE INDEX ix_work_items_search ON work_items USING GIN (search_vector)"
    )

    # --- work_item_assignees ---
    op.create_table(
        "work_item_assignees",
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    )

    # --- work_item_labels ---
    op.create_table(
        "work_item_labels",
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("label_id", sa.Integer(), sa.ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
    )

    # --- work_item_dependencies ---
    op.create_table(
        "work_item_dependencies",
        sa.Column("blocking_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("blocked_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.CheckConstraint("blocking_item_id != blocked_item_id", name="ck_no_self_dependency"),
    )
    op.create_index("ix_work_item_deps_blocked", "work_item_dependencies", ["blocked_item_id"])

    # --- activity_events ---
    activity_event_type = sa.Enum(
        "comment", "status_change", "priority_change",
        "assignee_added", "assignee_removed",
        "label_added", "label_removed",
        "created", "archived",
        "subtask_added", "subtask_completed",
        "due_date_change",
        name="activity_event_type",
    )
    op.create_table(
        "activity_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", activity_event_type, nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("old_value", sa.String(500), nullable=True),
        sa.Column("new_value", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_activity_events_item_created", "activity_events", ["work_item_id", "created_at"])

    # --- custom_field_definitions ---
    custom_field_type = sa.Enum("text", "number", "date", "select", "checkbox", name="custom_field_type")
    op.create_table(
        "custom_field_definitions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("field_type", custom_field_type, nullable=False),
        sa.Column("options", sa.JSON(), nullable=True),
        sa.Column("required", sa.Boolean(), server_default="false"),
        sa.Column("position", sa.Integer(), server_default="0"),
        sa.UniqueConstraint("project_id", "name"),
    )

    # --- custom_field_values ---
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

    # --- attachments ---
    op.create_table(
        "attachments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("content_type", sa.String(255), nullable=False),
        sa.Column("size_bytes", sa.Integer(), nullable=False),
        sa.Column("storage_key", sa.String(500), nullable=False),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_attachments_work_item_id", "attachments", ["work_item_id"])

    # --- workspace_invites ---
    op.create_table(
        "workspace_invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token", sa.String(255), unique=True, nullable=False),
        sa.Column("role", sa.String(50), nullable=False, server_default="member"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("use_count", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_workspace_invites_token", "workspace_invites", ["token"])

    # --- notifications ---
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("body", sa.Text(), nullable=False, server_default=""),
        sa.Column("read", sa.Boolean(), server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_notifications_user_read_created", "notifications", ["user_id", "read", "created_at"])

    # --- webhook_configs ---
    op.create_table(
        "webhook_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("workspace_id", sa.Integer(), sa.ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(1000), nullable=False),
        sa.Column("event_types", sa.JSON(), nullable=True),
        sa.Column("active", sa.Boolean(), server_default="true"),
    )

    # --- api_tokens ---
    op.create_table(
        "api_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("token_prefix", sa.String(12), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_api_tokens_user_id", "api_tokens", ["user_id"])

    # --- admin_audit_log ---
    op.create_table(
        "admin_audit_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("action", sa.String(100), nullable=False),
        sa.Column("entity_type", sa.String(50), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_admin_audit_log_entity", "admin_audit_log", ["entity_type", "entity_id"])
    op.create_index("ix_admin_audit_log_created", "admin_audit_log", ["created_at"])

    # --- item_templates ---
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

    # --- automation_rules ---
    op.create_table(
        "automation_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("trigger", sa.String(50), nullable=False),
        sa.Column("trigger_state_id", sa.Integer(), sa.ForeignKey("workflow_states.id", ondelete="CASCADE"), nullable=True),
        sa.Column("action", sa.String(50), nullable=False),
        sa.Column("action_config", sa.JSON(), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_automation_rules_project_trigger", "automation_rules", ["project_id", "trigger"])

    # --- item_watchers ---
    op.create_table(
        "item_watchers",
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- saved_views ---
    op.create_table(
        "saved_views",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("filters", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "user_id", "name"),
    )

    # --- subtasks ---
    op.create_table(
        "subtasks",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(500), nullable=False),
        sa.Column("completed", sa.Boolean(), server_default="false"),
        sa.Column("position", sa.Integer(), server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_subtasks_item_completed", "subtasks", ["work_item_id", "completed"])

    # --- project_members ---
    project_role = sa.Enum("viewer", "editor", "admin", name="project_role")
    op.create_table(
        "project_members",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("role", project_role, nullable=False, server_default="editor"),
        sa.UniqueConstraint("project_id", "user_id"),
    )
    op.create_index("ix_project_members_user_id", "project_members", ["user_id"])

    # --- recurrence_rules ---
    recurrence_frequency = sa.Enum("daily", "weekly", "monthly", name="recurrence_frequency")
    op.create_table(
        "recurrence_rules",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="CASCADE"), nullable=False),
        sa.Column("frequency", recurrence_frequency, nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=True),
        sa.Column("day_of_month", sa.Integer(), nullable=True),
        sa.Column("next_run_at", sa.Date(), nullable=False),
        sa.Column("enabled", sa.Boolean(), server_default="true"),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_recurrence_rules_next_run", "recurrence_rules", ["enabled", "next_run_at"])

    # --- email_log ---
    op.create_table(
        "email_log",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("work_item_id", sa.Integer(), sa.ForeignKey("work_items.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_email_log_user_id", "email_log", ["user_id"])


def downgrade() -> None:
    op.drop_table("email_log")
    op.drop_table("recurrence_rules")
    op.drop_table("project_members")
    op.drop_table("subtasks")
    op.drop_table("saved_views")
    op.drop_table("item_watchers")
    op.drop_table("automation_rules")
    op.drop_table("item_templates")
    op.drop_table("admin_audit_log")
    op.drop_table("api_tokens")
    op.drop_table("webhook_configs")
    op.drop_table("notifications")
    op.drop_table("workspace_invites")
    op.drop_table("attachments")
    op.drop_table("custom_field_values")
    op.drop_table("custom_field_definitions")
    op.drop_table("activity_events")
    op.drop_table("work_item_dependencies")
    op.drop_table("work_item_labels")
    op.drop_table("work_item_assignees")
    op.execute("DROP INDEX IF EXISTS ix_work_items_search")
    op.drop_table("work_items")
    op.drop_table("sprints")
    op.drop_table("labels")
    op.drop_table("workflow_states")
    op.drop_table("projects")
    op.drop_table("workspace_members")
    op.drop_table("workspaces")
    op.drop_table("users")

    for name in (
        "recurrence_frequency", "project_role", "sprint_status",
        "custom_field_type", "activity_event_type", "item_priority",
        "state_category", "project_template", "workspace_role",
    ):
        sa.Enum(name=name).drop(op.get_bind())
