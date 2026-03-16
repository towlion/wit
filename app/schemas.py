from datetime import datetime

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


class WorkItemUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status_id: int | None = None
    priority: str | None = None
    position: str | None = None
    archived: bool | None = None


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
    assignees: list[WorkItemAssigneeResponse] = []
    labels: list[LabelResponse] = []

    model_config = {"from_attributes": True}
