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
    created_at: datetime

    model_config = {"from_attributes": True}


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
class ProjectCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    template: str = "software"


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class ProjectResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: str | None
    template: str
    item_counter: int
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
