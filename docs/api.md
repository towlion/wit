# WIT API Reference

Base URL: `/api`

Authentication: JWT Bearer token via `Authorization: Bearer <token>` header. All endpoints require authentication unless noted otherwise.

## Auth

### POST /api/auth/register

Register a new user. Creates a default workspace automatically.

**Auth required:** No

```bash
curl -X POST https://wit.anulectra.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "display_name": "Jane Doe", "password": "secure_password"}'
```

**Response (201):**

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

**Errors:** 409 — email already registered.

### POST /api/auth/login

Authenticate and receive a JWT token.

**Auth required:** No

```bash
curl -X POST https://wit.anulectra.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "secure_password"}'
```

**Response (200):**

```json
{
  "access_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

**Errors:** 401 — invalid credentials.

### GET /api/auth/me

Get the current authenticated user.

```bash
curl https://wit.anulectra.com/api/auth/me \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
{
  "id": 1,
  "email": "user@example.com",
  "display_name": "Jane Doe",
  "created_at": "2026-01-15T10:30:00Z"
}
```

## Workspaces

### GET /api/workspaces

List all workspaces the user belongs to.

```bash
curl https://wit.anulectra.com/api/workspaces \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "name": "My Workspace",
    "slug": "my-workspace",
    "created_at": "2026-01-15T10:30:00Z",
    "role": "owner"
  }
]
```

### POST /api/workspaces

Create a new workspace. The authenticated user becomes the owner.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Team Workspace", "slug": "team-workspace"}'
```

**Response (201):** workspace object with members array. **Errors:** 409 — slug already taken.

### GET /api/workspaces/{slug}

Get workspace details including members.

### PATCH /api/workspaces/{slug}

Update workspace name. **Min role:** admin.

**Body:** `{"name": "New Name"}`

### DELETE /api/workspaces/{slug}

Delete workspace and all associated data. **Min role:** owner. **Response:** 204.

### POST /api/workspaces/{slug}/members

Add a user to the workspace. **Min role:** admin.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/members \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"email": "teammate@example.com", "role": "member"}'
```

**Response (201):** member object. **Errors:** 404 — user not found, 409 — already a member.

**Available roles:** `owner`, `admin`, `member`, `guest`

### PATCH /api/workspaces/{slug}/members/{user_id}

Update a member's role. **Min role:** admin.

**Body:** `{"role": "admin"}`

### DELETE /api/workspaces/{slug}/members/{user_id}

Remove a member from the workspace. **Min role:** admin. Cannot remove the owner. **Response:** 204.

## Projects

### GET /api/workspaces/{ws_slug}/projects

List all projects in a workspace.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "name": "Web App",
    "slug": "web-app",
    "description": "Main web application",
    "template": "software",
    "item_counter": 42,
    "created_at": "2026-01-15T10:30:00Z"
  }
]
```

### POST /api/workspaces/{ws_slug}/projects

Create a new project. Workflow states are seeded from the selected template. **Min role:** member.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Web App", "slug": "web-app", "description": "Main app", "template": "software"}'
```

**Templates:**

| Template | States |
|---|---|
| `software` (default) | Open, In Progress, In Review, Done |
| `home` | To Do, Doing, Done |
| `event` | Idea, Getting Quotes, Confirmed |

**Response (201):** project object. **Errors:** 409 — slug already exists in workspace.

### GET /api/workspaces/{ws_slug}/projects/{project_slug}

Get project details.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}

Update project name and/or description. **Min role:** member.

**Body:** `{"name": "Updated Name", "description": "Updated desc"}`

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}

Delete project and all associated items, labels, and states. **Min role:** admin. **Response:** 204.

## Work Items

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items

List all non-archived work items. Ordered by position (for Kanban board display).

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 5,
    "project_id": 1,
    "item_number": 1,
    "title": "Fix login bug",
    "description": "Users cannot log in after password reset",
    "status_id": 2,
    "priority": "high",
    "position": "a0",
    "archived": false,
    "created_by_id": 1,
    "created_at": "2026-01-15T10:30:00Z",
    "assignees": [...],
    "labels": [...]
  }
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items

Create a new work item. `item_number` auto-increments per project. Defaults to first workflow state.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Fix login bug", "description": "Cannot log in after reset", "priority": "high"}'
```

**Priority options:** `low`, `medium` (default), `high`, `urgent`

**Response (201):** work item object with assignees and labels arrays.

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}

Get work item details including assignees and labels.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}

Update work item properties. All fields optional.

**Body:** `{"title": "...", "description": "...", "status_id": 3, "priority": "low", "position": "b5", "archived": true}`

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}

Delete work item. **Response:** 204.

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/assignees/{user_id}

Assign a workspace member to a work item. **Response:** 201. **Errors:** 409 — already assigned.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/assignees/{user_id}

Remove assignee from work item. **Response:** 204.

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/labels/{label_id}

Add a label to a work item. **Response:** 201. **Errors:** 409 — already applied.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/labels/{label_id}

Remove a label from a work item. **Response:** 204.

## Labels

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/labels

List all labels in a project.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/labels \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {"id": 1, "project_id": 1, "name": "bug", "color": "#ef4444"},
  {"id": 2, "project_id": 1, "name": "feature", "color": "#10b981"}
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/labels

Create a label.

**Body:** `{"name": "bug", "color": "#ef4444"}`

**Response (201):** label object. **Errors:** 409 — name already exists in project.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/labels/{label_id}

Update label name and/or color.

**Body:** `{"name": "critical-bug", "color": "#dc2626"}`

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/labels/{label_id}

Delete label. Removes it from all work items. **Response:** 204.

## Workflow States

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/states

List all workflow states. Ordered by position.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/states \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {"id": 1, "project_id": 1, "name": "Open", "category": "todo", "position": 0, "color": "#6b7280"},
  {"id": 2, "project_id": 1, "name": "In Progress", "category": "in_progress", "position": 1, "color": "#3b82f6"},
  {"id": 3, "project_id": 1, "name": "In Review", "category": "in_progress", "position": 2, "color": "#8b5cf6"},
  {"id": 4, "project_id": 1, "name": "Done", "category": "done", "position": 3, "color": "#22c55e"}
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/states

Create a workflow state.

**Body:** `{"name": "On Hold", "category": "in_progress", "position": 2, "color": "#f59e0b"}`

**Category options:** `todo`, `in_progress`, `done`

**Response (201):** state object.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/states/{state_id}

Update state name, category, position, and/or color.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/states/{state_id}

Delete workflow state. **Response:** 204.

## Health Check

### GET /health

System health check. **Auth required:** No.

```bash
curl https://wit.anulectra.com/health
```

**Response (200):**

```json
{"status": "ok"}
```

## Roles and Permissions

| Role | Level | Can manage members | Can delete projects | Can create/edit items | Can view |
|---|---|---|---|---|---|
| owner | 0 | Yes | Yes | Yes | Yes |
| admin | 1 | Yes | Yes | Yes | Yes |
| member | 2 | No | No | Yes | Yes |
| guest | 3 | No | No | No | Yes |

## Error Format

All errors return:

```json
{"detail": "Error message"}
```

| Status | Meaning |
|---|---|
| 400 | Bad request (invalid input) |
| 401 | Unauthorized (missing or invalid token) |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 409 | Conflict (duplicate slug, email, or assignment) |

## Authentication Details

- **Algorithm:** HS256
- **Token expiry:** 72 hours (configurable via `JWT_EXPIRY_HOURS`)
- **Header format:** `Authorization: Bearer <token>`
