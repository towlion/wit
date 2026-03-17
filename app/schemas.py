from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


# --- Auth ---
class RegisterRequest(BaseModel):
    """Register a new user account."""
    email: EmailStr = Field(description="User's email address", examples=["user@example.com"])
    display_name: str = Field(description="Display name", examples=["Jane Doe"])
    password: str = Field(min_length=8, description="Password (min 8 characters)")


class LoginRequest(BaseModel):
    """Authenticate with email and password."""
    email: EmailStr = Field(description="User's email address", examples=["user@example.com"])
    password: str = Field(description="Account password")


class TokenResponse(BaseModel):
    """JWT access token response."""
    access_token: str = Field(description="JWT access token")
    token_type: str = Field(default="bearer", description="Token type")


class UserResponse(BaseModel):
    """Public user profile."""
    id: int
    email: str
    display_name: str
    is_superuser: bool = False
    theme: str | None = None
    email_notifications: bool = False
    email_digest_mode: str = "immediate"
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Profile ---
class ProfileUpdate(BaseModel):
    """Update current user's profile."""
    display_name: str | None = Field(default=None, description="New display name")
    theme: str | None = Field(default=None, description="Theme preference: dark, light, or system")
    email_notifications: bool | None = Field(default=None, description="Enable email notifications")
    email_digest_mode: str | None = Field(default=None, description="Digest mode: immediate or daily")


class PasswordChange(BaseModel):
    """Change current user's password."""
    current_password: str = Field(description="Current password for verification")
    new_password: str = Field(description="New password (min 8 characters)")


# --- Workspace ---
class WorkspaceCreate(BaseModel):
    """Create a new workspace."""
    name: str = Field(description="Workspace display name", examples=["My Team"])
    slug: str = Field(description="URL-safe identifier", examples=["my-team"])


class WorkspaceUpdate(BaseModel):
    """Update workspace properties."""
    name: str | None = Field(default=None, description="New workspace name")


class MemberResponse(BaseModel):
    """Workspace member details."""
    user_id: int
    email: str
    display_name: str
    role: str = Field(description="Role: owner, admin, member, or guest")

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    """Workspace with member list."""
    id: int
    name: str
    slug: str
    created_at: datetime
    members: list[MemberResponse] = []

    model_config = {"from_attributes": True}


class WorkspaceListItem(BaseModel):
    """Workspace summary for list views."""
    id: int
    name: str
    slug: str
    created_at: datetime
    role: str = Field(description="Current user's role in this workspace")

    model_config = {"from_attributes": True}


class AddMemberRequest(BaseModel):
    """Add a user to a workspace by email."""
    email: str = Field(description="Email of user to add", examples=["colleague@example.com"])
    role: str = Field(default="member", description="Role to assign: admin, member, or guest")


class UpdateMemberRequest(BaseModel):
    """Update a member's role."""
    role: str = Field(description="New role: admin, member, or guest")


# --- Project ---
class CardDisplaySettings(BaseModel):
    """Board card display preferences."""
    show_priority: bool = True
    show_due_date: bool = True
    show_labels: bool = True
    show_assignees: bool = True
    show_description: bool = False


class BoardSettings(BaseModel):
    """Kanban board configuration."""
    wip_limits: dict[str, int] = Field(default={}, description="WIP limits per state name")
    swimlane: str | None = Field(default=None, description="Swimlane grouping: priority, assignee, or label")
    card_display: CardDisplaySettings = CardDisplaySettings()


class ProjectCreate(BaseModel):
    """Create a new project."""
    name: str = Field(description="Project name", examples=["Backend API"])
    slug: str = Field(description="URL-safe identifier", examples=["backend-api"])
    description: str | None = Field(default=None, description="Project description")
    template: str = Field(default="software", description="Workflow template: software, home, or event")


class ProjectUpdate(BaseModel):
    """Update project properties."""
    name: str | None = Field(default=None, description="New project name")
    description: str | None = Field(default=None, description="New description")
    board_settings: BoardSettings | None = Field(default=None, description="Board configuration")


class ProjectResponse(BaseModel):
    """Project details."""
    id: int
    name: str
    slug: str
    description: str | None
    template: str
    item_counter: int = Field(description="Next item number counter")
    board_settings: BoardSettings | None = None
    created_at: datetime
    user_role: str | None = None

    model_config = {"from_attributes": True}


# --- Workflow State ---
class StateCreate(BaseModel):
    """Create a workflow state."""
    name: str = Field(description="State name", examples=["In Review"])
    category: str = Field(description="Category: todo, in_progress, or done")
    position: int = Field(default=0, description="Display order")
    color: str = Field(default="#6b7280", description="Hex color code")


class StateUpdate(BaseModel):
    """Update a workflow state."""
    name: str | None = None
    category: str | None = None
    position: int | None = None
    color: str | None = None


class StateResponse(BaseModel):
    """Workflow state details."""
    id: int
    project_id: int
    name: str
    category: str
    position: int
    color: str

    model_config = {"from_attributes": True}


# --- Label ---
class LabelCreate(BaseModel):
    """Create a project label."""
    name: str = Field(description="Label name", examples=["bug"])
    color: str = Field(default="#6b7280", description="Hex color code")


class LabelUpdate(BaseModel):
    """Update a label."""
    name: str | None = None
    color: str | None = None


class LabelResponse(BaseModel):
    """Label details."""
    id: int
    project_id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


# --- Work Item ---
class WorkItemCreate(BaseModel):
    """Create a work item."""
    title: str = Field(description="Item title", examples=["Fix login bug"])
    description: str | None = Field(default=None, description="Markdown description")
    status_id: int | None = Field(default=None, description="Workflow state ID (defaults to first state)")
    priority: str = Field(default="medium", description="Priority: low, medium, high, or critical")
    due_date: date | None = Field(default=None, description="Due date (YYYY-MM-DD)")
    sprint_id: int | None = Field(default=None, description="Sprint ID")


class WorkItemUpdate(BaseModel):
    """Update a work item."""
    title: str | None = None
    description: str | None = None
    status_id: int | None = None
    priority: str | None = None
    position: str | None = Field(default=None, description="Lexorank position string")
    archived: bool | None = None
    due_date: date | None = None
    sprint_id: int | None = None


class WorkItemAssigneeResponse(BaseModel):
    """Assigned user summary."""
    id: int
    email: str
    display_name: str

    model_config = {"from_attributes": True}


class DependencyItem(BaseModel):
    """A dependency link to another item."""
    item_id: int
    item_number: int
    title: str


class DependencyCreate(BaseModel):
    """Add a dependency (this item blocks another)."""
    blocks_item_number: int = Field(description="Item number that this item blocks")


class DependencyResponse(BaseModel):
    """Dependency graph for a work item."""
    blocks: list[DependencyItem] = Field(default=[], description="Items blocked by this item")
    blocked_by: list[DependencyItem] = Field(default=[], description="Items blocking this item")


class WorkItemResponse(BaseModel):
    """Work item with assignees, labels, and dependencies."""
    id: int
    project_id: int
    item_number: int
    title: str
    description: str | None
    status_id: int
    priority: str
    position: str
    archived: bool
    created_by_id: int
    created_at: datetime
    due_date: date | None = None
    sprint_id: int | None = None
    assignees: list[WorkItemAssigneeResponse] = []
    labels: list[LabelResponse] = []
    blocks: list[DependencyItem] = []
    blocked_by: list[DependencyItem] = []
    subtask_summary: dict | None = None

    model_config = {"from_attributes": True}


# --- Activity ---
class ActivityEventResponse(BaseModel):
    """Activity event or comment."""
    id: int
    work_item_id: int
    user_id: int | None
    event_type: str = Field(description="Event type: created, comment, status_change, etc.")
    body: str | None = Field(default=None, description="Comment body (for comment events)")
    old_value: str | None = None
    new_value: str | None = None
    created_at: datetime
    user: UserResponse | None = None

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    """Add a comment to a work item."""
    body: str = Field(description="Comment body (supports markdown and @mentions)")


class CommentUpdate(BaseModel):
    """Edit an existing comment."""
    body: str = Field(description="Updated comment body")


# --- Search ---
class SearchResultResponse(BaseModel):
    """Full-text search result."""
    item: WorkItemResponse
    headline: str = Field(description="Highlighted match snippet")
    rank: float = Field(description="Relevance score")


# --- Custom Fields ---
class CustomFieldDefinitionCreate(BaseModel):
    """Define a custom field for a project."""
    name: str = Field(description="Field name", examples=["Sprint"])
    field_type: str = Field(description="Type: text, number, or date")
    options: dict | None = Field(default=None, description="Type-specific options")
    required: bool = False
    position: int = Field(default=0, description="Display order")


class CustomFieldDefinitionUpdate(BaseModel):
    """Update a custom field definition."""
    name: str | None = None
    field_type: str | None = None
    options: dict | None = None
    required: bool | None = None
    position: int | None = None


class CustomFieldDefinitionResponse(BaseModel):
    """Custom field definition."""
    id: int
    project_id: int
    name: str
    field_type: str
    options: dict | None
    required: bool
    position: int

    model_config = {"from_attributes": True}


class CustomFieldValueSet(BaseModel):
    """Set a custom field value on a work item."""
    value_text: str | None = None
    value_number: float | None = None
    value_date: date | None = None


class CustomFieldValueResponse(BaseModel):
    """Custom field value."""
    id: int
    work_item_id: int
    field_id: int
    value_text: str | None
    value_number: float | None
    value_date: date | None

    model_config = {"from_attributes": True}


# --- Attachments ---
class AttachmentResponse(BaseModel):
    """File attachment metadata."""
    id: int
    work_item_id: int
    filename: str
    content_type: str
    size_bytes: int
    storage_key: str
    uploaded_by_id: int | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Invites ---
class InviteCreate(BaseModel):
    """Create a workspace invitation link."""
    role: str = Field(default="member", description="Role for invited users")
    expires_hours: int | None = Field(default=72, description="Hours until expiration (null = never)")
    max_uses: int | None = Field(default=None, description="Max number of uses (null = unlimited)")


class InviteResponse(BaseModel):
    """Workspace invite details."""
    id: int
    workspace_id: int
    token: str = Field(description="Invite token for the accept URL")
    role: str
    created_by_id: int | None
    expires_at: datetime | None
    max_uses: int | None
    use_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class InvitePublicResponse(BaseModel):
    """Public invite info (no auth required)."""
    workspace_name: str
    role: str


# --- Notifications ---
class NotificationResponse(BaseModel):
    """User notification."""
    id: int
    user_id: int
    work_item_id: int | None
    event_type: str = Field(description="Event type: comment, mention, status_change, etc.")
    title: str
    body: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Watch ---
class WatchResponse(BaseModel):
    """Watch status for a work item."""
    watching: bool = Field(description="Whether the current user is watching")
    watcher_count: int = Field(description="Total number of watchers")


# --- Webhooks ---
class WebhookConfigCreate(BaseModel):
    """Create a webhook configuration."""
    url: str = Field(description="Webhook delivery URL", examples=["https://example.com/webhook"])
    event_types: dict | None = Field(default=None, description="Event filter (null = all events)")
    active: bool = Field(default=True, description="Whether the webhook is active")


class WebhookConfigUpdate(BaseModel):
    """Update a webhook configuration."""
    url: str | None = None
    event_types: dict | None = None
    active: bool | None = None


class WebhookConfigResponse(BaseModel):
    """Webhook configuration."""
    id: int
    workspace_id: int
    url: str
    event_types: dict | None
    active: bool

    model_config = {"from_attributes": True}


# --- API Tokens ---
class ApiTokenCreate(BaseModel):
    """Create a personal API token."""
    name: str = Field(description="Token name for identification", examples=["CI deploy"])
    expires_in_days: int | None = Field(default=30, description="Days until expiration (null = never)")


class ApiTokenCreateResponse(BaseModel):
    """Newly created API token (token shown only once)."""
    id: int
    name: str
    token: str = Field(description="Full token value (only returned on creation)")
    token_prefix: str = Field(description="First 12 characters for identification")
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiTokenResponse(BaseModel):
    """API token summary (token value not included)."""
    id: int
    name: str
    token_prefix: str
    expires_at: datetime | None
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Admin ---
class AdminDashboardResponse(BaseModel):
    """System-wide statistics."""
    total_users: int
    active_users: int
    total_workspaces: int
    total_items: int
    signups_last_7d: int


class AdminUserResponse(BaseModel):
    """Admin user view with workspace count."""
    id: int
    email: str
    display_name: str
    is_superuser: bool
    is_active: bool
    created_at: datetime
    workspace_count: int

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    """Update user flags (superuser only)."""
    is_active: bool | None = Field(default=None, description="Enable/disable user account")
    is_superuser: bool | None = Field(default=None, description="Grant/revoke superuser status")


class AdminWorkspaceResponse(BaseModel):
    """Admin workspace view with counts."""
    id: int
    name: str
    slug: str
    created_at: datetime
    member_count: int
    project_count: int
    item_count: int

    model_config = {"from_attributes": True}


class AdminAuditLogResponse(BaseModel):
    """Admin audit log entry."""
    id: int
    actor_id: int | None
    action: str
    entity_type: str
    entity_id: int
    details: dict | None
    created_at: datetime
    actor: UserResponse | None = None

    model_config = {"from_attributes": True}


# --- Workspace Stats ---
class WorkspaceStatsResponse(BaseModel):
    """Workspace usage statistics."""
    items_total: int
    items_last_7d: int
    active_members: int
    attachment_count: int
    storage_bytes: int


# --- Bulk Operations ---
class BulkArchiveRequest(BaseModel):
    """Archive multiple items at once."""
    item_ids: list[int] = Field(description="List of work item IDs to archive")


class BulkReassignRequest(BaseModel):
    """Reassign multiple items to a user."""
    item_ids: list[int] = Field(description="List of work item IDs")
    assignee_id: int = Field(description="User ID to assign")


class BulkLabelsRequest(BaseModel):
    """Add or remove a label from multiple items."""
    item_ids: list[int] = Field(description="List of work item IDs")
    label_id: int = Field(description="Label ID to add or remove")
    action: str = Field(description="'add' or 'remove'")


class BulkStatusRequest(BaseModel):
    """Change status of multiple items at once."""
    item_ids: list[int] = Field(description="List of work item IDs")
    status_id: int = Field(description="Target workflow state ID")


class BulkOperationResponse(BaseModel):
    """Result of a bulk operation."""
    affected: int = Field(description="Number of items affected")


# --- Cross-Project ---
class CrossProjectItemResponse(BaseModel):
    """Work item from the cross-project board view."""
    id: int
    project_id: int
    project_name: str
    project_slug: str
    item_number: int
    title: str
    description: str | None
    status_name: str
    status_category: str
    status_color: str
    priority: str
    due_date: date | None = None
    created_at: datetime
    assignee_names: list[str] = []


# --- Item Templates ---
class ItemTemplateCreate(BaseModel):
    """Create an item template."""
    name: str = Field(description="Template name", examples=["Bug Report"])
    title_template: str = Field(default="", description="Default title text")
    description_template: str | None = Field(default=None, description="Default description (markdown)")
    priority: str = Field(default="medium", description="Default priority")
    label_ids: list[int] | None = Field(default=None, description="Default label IDs")


class ItemTemplateUpdate(BaseModel):
    """Update an item template."""
    name: str | None = None
    title_template: str | None = None
    description_template: str | None = None
    priority: str | None = None
    label_ids: list[int] | None = None


class ItemTemplateResponse(BaseModel):
    """Item template details."""
    id: int
    project_id: int
    name: str
    title_template: str
    description_template: str | None
    priority: str
    label_ids: list[int] | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Automation Rules ---
class AutomationRuleCreate(BaseModel):
    """Create an automation rule."""
    name: str = Field(description="Rule name", examples=["Auto-assign on In Progress"])
    trigger: str = Field(description="Trigger type: on_enter_state")
    trigger_state_id: int | None = Field(default=None, description="State ID that triggers the rule")
    action: str = Field(description="Action type: set_assignee, add_label, set_priority")
    action_config: dict = Field(description="Action parameters")
    enabled: bool = Field(default=True, description="Whether the rule is active")


class AutomationRuleUpdate(BaseModel):
    """Update an automation rule."""
    name: str | None = None
    trigger: str | None = None
    trigger_state_id: int | None = None
    action: str | None = None
    action_config: dict | None = None
    enabled: bool | None = None


class AutomationRuleResponse(BaseModel):
    """Automation rule details."""
    id: int
    project_id: int
    name: str
    trigger: str
    trigger_state_id: int | None
    action: str
    action_config: dict
    enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Insights ---
class StatusDistributionItem(BaseModel):
    """Item count per workflow state."""
    state_id: int
    state_name: str
    category: str
    color: str
    count: int


class PriorityDistributionItem(BaseModel):
    """Item count per priority level."""
    priority: str
    count: int


class BurndownPoint(BaseModel):
    """Daily burndown data point."""
    date: date
    remaining: int = Field(description="Remaining active items")


class CycleTimeStats(BaseModel):
    """Cycle time statistics for completed items."""
    avg_days: float | None = Field(default=None, description="Average days from in_progress to done")
    median_days: float | None = None
    count: int = Field(description="Number of items with cycle time data")


class MemberBreakdown(BaseModel):
    """Per-member contribution summary."""
    user_id: int
    display_name: str
    items_created: int
    items_completed: int
    items_assigned: int


class RecentlyCompletedItem(BaseModel):
    """Recently completed work item."""
    item_number: int
    title: str
    completed_at: datetime
    completed_by: str | None


class ProjectInsightsResponse(BaseModel):
    """Project analytics dashboard data."""
    status_distribution: list[StatusDistributionItem]
    priority_distribution: list[PriorityDistributionItem]
    burndown: list[BurndownPoint]
    cycle_time: CycleTimeStats
    member_breakdown: list[MemberBreakdown]
    recently_completed: list[RecentlyCompletedItem]


class ProjectSummary(BaseModel):
    """Project completion summary for workspace insights."""
    project_id: int
    project_name: str
    project_slug: str
    total_items: int
    completed_items: int
    completion_rate: float = Field(description="Percentage of items completed")


class ActiveMemberSummary(BaseModel):
    """Most active member summary."""
    user_id: int
    display_name: str
    events_count: int = Field(description="Activity events in the last 30 days")


class ActivityTrendPoint(BaseModel):
    """Daily activity count."""
    date: date
    count: int


class WorkspaceInsightsResponse(BaseModel):
    """Workspace-level analytics."""
    project_summaries: list[ProjectSummary]
    most_active_members: list[ActiveMemberSummary]
    activity_trend: list[ActivityTrendPoint]


# --- Saved Views ---
class SavedViewCreate(BaseModel):
    """Save a filter view."""
    name: str = Field(description="View name", examples=["My Open Bugs"])
    filters: dict = Field(description="Filter criteria (status, priority, assignee, etc.)")


class SavedViewResponse(BaseModel):
    """Saved filter view."""
    id: int
    project_id: int
    user_id: int
    name: str
    filters: dict
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Subtasks ---
class SubtaskCreate(BaseModel):
    """Create a subtask / checklist item."""
    title: str = Field(description="Subtask title")


class SubtaskUpdate(BaseModel):
    """Update a subtask."""
    title: str | None = None
    completed: bool | None = Field(default=None, description="Toggle completion")
    position: int | None = Field(default=None, description="Display order")


class SubtaskResponse(BaseModel):
    """Subtask details."""
    id: int
    work_item_id: int
    title: str
    completed: bool
    position: int
    created_at: datetime

    model_config = {"from_attributes": True}


class SubtaskSummary(BaseModel):
    """Subtask completion summary."""
    total: int
    completed: int


# --- Recurrences ---
class RecurrenceRuleCreate(BaseModel):
    """Create a recurrence rule for an item."""
    template_item_number: int = Field(description="Item number to use as template")
    frequency: str = Field(description="Frequency: daily, weekly, or monthly")
    day_of_week: int | None = Field(default=None, description="Day of week (0=Mon..6=Sun)")
    day_of_month: int | None = Field(default=None, description="Day of month (1-31)")


class RecurrenceRuleUpdate(BaseModel):
    """Update a recurrence rule."""
    frequency: str | None = None
    day_of_week: int | None = None
    day_of_month: int | None = None
    enabled: bool | None = None


class RecurrenceRuleResponse(BaseModel):
    """Recurrence rule details."""
    id: int
    project_id: int
    template_item_id: int
    template_item_number: int
    template_title: str
    frequency: str
    day_of_week: int | None
    day_of_month: int | None
    next_run_at: date
    enabled: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class RecurrenceProcessResponse(BaseModel):
    """Result of processing recurrence rules."""
    created: int


# --- Import/Export ---
class ImportCsvResponse(BaseModel):
    """Result of CSV import."""
    created: int
    errors: list[dict]


class ImportJsonResponse(BaseModel):
    """Result of JSON import."""
    created: int
    states_created: int
    labels_created: int


# --- Sprints ---
class SprintCreate(BaseModel):
    """Create a sprint."""
    name: str = Field(description="Sprint name", examples=["Sprint 1"])
    start_date: date = Field(description="Sprint start date")
    end_date: date = Field(description="Sprint end date")
    goal: str | None = Field(default=None, description="Sprint goal")


class SprintUpdate(BaseModel):
    """Update a sprint."""
    name: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    status: str | None = Field(default=None, description="Status: planning, active, or completed")
    goal: str | None = None


class SprintResponse(BaseModel):
    """Sprint details with item counts."""
    id: int
    project_id: int
    name: str
    start_date: date
    end_date: date
    status: str
    goal: str | None
    created_at: datetime
    item_count: int = 0
    completed_count: int = 0

    model_config = {"from_attributes": True}


class SprintVelocityItem(BaseModel):
    """Velocity data for a sprint."""
    sprint_id: int
    sprint_name: str
    total_items: int
    completed_items: int


# --- Project Members ---
class ProjectMemberCreate(BaseModel):
    """Add a member to a project."""
    email: str = Field(description="Email of the user to add")
    role: str = Field(default="editor", description="Role: viewer, editor, or admin")


class ProjectMemberUpdate(BaseModel):
    """Update a project member's role."""
    role: str = Field(description="New role: viewer, editor, or admin")


class ProjectMemberResponse(BaseModel):
    """Project member with effective role."""
    user_id: int
    email: str
    display_name: str
    role: str

    model_config = {"from_attributes": True}
