from datetime import date, datetime

from pydantic import BaseModel, EmailStr


# --- Auth ---
class RegisterRequest(BaseModel):
    email: EmailStr
    display_name: str
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    is_superuser: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Profile ---
class ProfileUpdate(BaseModel):
    display_name: str | None = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# --- Workspace ---
class WorkspaceCreate(BaseModel):
    name: str
    slug: str


class WorkspaceUpdate(BaseModel):
    name: str | None = None


class MemberResponse(BaseModel):
    user_id: int
    email: str
    display_name: str
    role: str

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime
    members: list[MemberResponse] = []

    model_config = {"from_attributes": True}


class WorkspaceListItem(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime
    role: str

    model_config = {"from_attributes": True}


class AddMemberRequest(BaseModel):
    email: str
    role: str = "member"


class UpdateMemberRequest(BaseModel):
    role: str


# --- Project ---
class CardDisplaySettings(BaseModel):
    show_priority: bool = True
    show_due_date: bool = True
    show_labels: bool = True
    show_assignees: bool = True
    show_description: bool = False


class BoardSettings(BaseModel):
    wip_limits: dict[str, int] = {}
    swimlane: str | None = None
    card_display: CardDisplaySettings = CardDisplaySettings()


class ProjectCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    template: str = "software"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    board_settings: BoardSettings | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    template: str
    item_counter: int
    board_settings: BoardSettings | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Workflow State ---
class StateCreate(BaseModel):
    name: str
    category: str
    position: int = 0
    color: str = "#6b7280"


class StateUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    position: int | None = None
    color: str | None = None


class StateResponse(BaseModel):
    id: int
    project_id: int
    name: str
    category: str
    position: int
    color: str

    model_config = {"from_attributes": True}


# --- Label ---
class LabelCreate(BaseModel):
    name: str
    color: str = "#6b7280"


class LabelUpdate(BaseModel):
    name: str | None = None
    color: str | None = None


class LabelResponse(BaseModel):
    id: int
    project_id: int
    name: str
    color: str

    model_config = {"from_attributes": True}


# --- Work Item ---
class WorkItemCreate(BaseModel):
    title: str
    description: str | None = None
    status_id: int | None = None
    priority: str = "medium"
    due_date: date | None = None


class WorkItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status_id: int | None = None
    priority: str | None = None
    position: str | None = None
    archived: bool | None = None
    due_date: date | None = None


class WorkItemAssigneeResponse(BaseModel):
    id: int
    email: str
    display_name: str

    model_config = {"from_attributes": True}


class WorkItemResponse(BaseModel):
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
    assignees: list[WorkItemAssigneeResponse] = []
    labels: list[LabelResponse] = []

    model_config = {"from_attributes": True}


# --- Activity ---
class ActivityEventResponse(BaseModel):
    id: int
    work_item_id: int
    user_id: int | None
    event_type: str
    body: str | None
    old_value: str | None
    new_value: str | None
    created_at: datetime
    user: UserResponse | None = None

    model_config = {"from_attributes": True}


class CommentCreate(BaseModel):
    body: str


class CommentUpdate(BaseModel):
    body: str


# --- Search ---
class SearchResultResponse(BaseModel):
    item: WorkItemResponse
    headline: str
    rank: float


# --- Custom Fields ---
class CustomFieldDefinitionCreate(BaseModel):
    name: str
    field_type: str
    options: dict | None = None
    required: bool = False
    position: int = 0


class CustomFieldDefinitionUpdate(BaseModel):
    name: str | None = None
    field_type: str | None = None
    options: dict | None = None
    required: bool | None = None
    position: int | None = None


class CustomFieldDefinitionResponse(BaseModel):
    id: int
    project_id: int
    name: str
    field_type: str
    options: dict | None
    required: bool
    position: int

    model_config = {"from_attributes": True}


class CustomFieldValueSet(BaseModel):
    value_text: str | None = None
    value_number: float | None = None
    value_date: date | None = None


class CustomFieldValueResponse(BaseModel):
    id: int
    work_item_id: int
    field_id: int
    value_text: str | None
    value_number: float | None
    value_date: date | None

    model_config = {"from_attributes": True}


# --- Attachments ---
class AttachmentResponse(BaseModel):
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
    role: str = "member"
    expires_hours: int | None = 72
    max_uses: int | None = None


class InviteResponse(BaseModel):
    id: int
    workspace_id: int
    token: str
    role: str
    created_by_id: int | None
    expires_at: datetime | None
    max_uses: int | None
    use_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class InvitePublicResponse(BaseModel):
    workspace_name: str
    role: str


# --- Notifications ---
class NotificationResponse(BaseModel):
    id: int
    user_id: int
    work_item_id: int | None
    event_type: str
    title: str
    body: str
    read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Webhooks ---
class WebhookConfigCreate(BaseModel):
    url: str
    event_types: dict | None = None
    active: bool = True


class WebhookConfigUpdate(BaseModel):
    url: str | None = None
    event_types: dict | None = None
    active: bool | None = None


class WebhookConfigResponse(BaseModel):
    id: int
    workspace_id: int
    url: str
    event_types: dict | None
    active: bool

    model_config = {"from_attributes": True}


# --- API Tokens ---
class ApiTokenCreate(BaseModel):
    name: str
    expires_in_days: int | None = 30


class ApiTokenCreateResponse(BaseModel):
    id: int
    name: str
    token: str
    token_prefix: str
    expires_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiTokenResponse(BaseModel):
    id: int
    name: str
    token_prefix: str
    expires_at: datetime | None
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


# --- Admin ---
class AdminDashboardResponse(BaseModel):
    total_users: int
    active_users: int
    total_workspaces: int
    total_items: int
    signups_last_7d: int


class AdminUserResponse(BaseModel):
    id: int
    email: str
    display_name: str
    is_superuser: bool
    is_active: bool
    created_at: datetime
    workspace_count: int

    model_config = {"from_attributes": True}


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    is_superuser: bool | None = None


class AdminWorkspaceResponse(BaseModel):
    id: int
    name: str
    slug: str
    created_at: datetime
    member_count: int
    project_count: int
    item_count: int

    model_config = {"from_attributes": True}


class AdminAuditLogResponse(BaseModel):
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
    items_total: int
    items_last_7d: int
    active_members: int
    attachment_count: int
    storage_bytes: int


# --- Bulk Operations ---
class BulkArchiveRequest(BaseModel):
    item_ids: list[int]


class BulkReassignRequest(BaseModel):
    item_ids: list[int]
    assignee_id: int


class BulkLabelsRequest(BaseModel):
    item_ids: list[int]
    label_id: int
    action: str  # "add" or "remove"


class BulkOperationResponse(BaseModel):
    affected: int


# --- Cross-Project ---
class CrossProjectItemResponse(BaseModel):
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
    name: str
    title_template: str = ""
    description_template: str | None = None
    priority: str = "medium"
    label_ids: list[int] | None = None


class ItemTemplateUpdate(BaseModel):
    name: str | None = None
    title_template: str | None = None
    description_template: str | None = None
    priority: str | None = None
    label_ids: list[int] | None = None


class ItemTemplateResponse(BaseModel):
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
    name: str
    trigger: str
    trigger_state_id: int | None = None
    action: str
    action_config: dict
    enabled: bool = True


class AutomationRuleUpdate(BaseModel):
    name: str | None = None
    trigger: str | None = None
    trigger_state_id: int | None = None
    action: str | None = None
    action_config: dict | None = None
    enabled: bool | None = None


class AutomationRuleResponse(BaseModel):
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
    state_id: int
    state_name: str
    category: str
    color: str
    count: int


class PriorityDistributionItem(BaseModel):
    priority: str
    count: int


class BurndownPoint(BaseModel):
    date: date
    remaining: int


class CycleTimeStats(BaseModel):
    avg_days: float | None
    median_days: float | None
    count: int


class MemberBreakdown(BaseModel):
    user_id: int
    display_name: str
    items_created: int
    items_completed: int
    items_assigned: int


class RecentlyCompletedItem(BaseModel):
    item_number: int
    title: str
    completed_at: datetime
    completed_by: str | None


class ProjectInsightsResponse(BaseModel):
    status_distribution: list[StatusDistributionItem]
    priority_distribution: list[PriorityDistributionItem]
    burndown: list[BurndownPoint]
    cycle_time: CycleTimeStats
    member_breakdown: list[MemberBreakdown]
    recently_completed: list[RecentlyCompletedItem]


class ProjectSummary(BaseModel):
    project_id: int
    project_name: str
    project_slug: str
    total_items: int
    completed_items: int
    completion_rate: float


class ActiveMemberSummary(BaseModel):
    user_id: int
    display_name: str
    events_count: int


class ActivityTrendPoint(BaseModel):
    date: date
    count: int


class WorkspaceInsightsResponse(BaseModel):
    project_summaries: list[ProjectSummary]
    most_active_members: list[ActiveMemberSummary]
    activity_trend: list[ActivityTrendPoint]
