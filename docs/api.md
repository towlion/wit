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

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `overdue` | bool | Filter to items past their due date (default: false) |
| `due_before` | date | Items due on or before this date |
| `due_after` | date | Items due on or after this date |

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items \
  -H "Authorization: Bearer <token>"

# Filter to overdue items
curl "https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items?overdue=true" \
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
    "due_date": "2026-04-01",
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
  -d '{"title": "Fix login bug", "description": "Cannot log in after reset", "priority": "high", "due_date": "2026-04-01"}'
```

**Priority options:** `low`, `medium` (default), `high`, `urgent`

**Optional fields:** `due_date` (ISO date, e.g. `"2026-04-01"`)

**Response (201):** work item object with assignees and labels arrays.

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}

Get work item details including assignees and labels.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}

Update work item properties. All fields optional.

**Body:** `{"title": "...", "description": "...", "status_id": 3, "priority": "low", "position": "b5", "archived": true, "due_date": "2026-04-01"}`

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

## Activity & Comments

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/activity

List activity events for a work item (status changes, priority changes, comments, etc.). Ordered newest first.

**Query parameters:** `limit` (default 50, max 200), `offset` (default 0)

```bash
curl "https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/activity?limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 10,
    "work_item_id": 5,
    "user_id": 1,
    "event_type": "comment",
    "body": "Looks good, merging now.",
    "old_value": null,
    "new_value": null,
    "created_at": "2026-01-16T09:00:00Z",
    "user": {"id": 1, "email": "user@example.com", "display_name": "Jane Doe", "created_at": "..."}
  },
  {
    "id": 9,
    "work_item_id": 5,
    "user_id": 1,
    "event_type": "status_change",
    "body": null,
    "old_value": "Open",
    "new_value": "In Review",
    "created_at": "2026-01-15T14:00:00Z",
    "user": {"id": 1, "email": "user@example.com", "display_name": "Jane Doe", "created_at": "..."}
  }
]
```

**Event types:** `comment`, `status_change`, `priority_change`, `assignee_add`, `assignee_remove`, `label_add`, `label_remove`, `created`, `archived`

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/comments

Create a comment on a work item.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/comments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"body": "This needs more investigation."}'
```

**Response (201):** activity event object with `event_type: "comment"`.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/comments/{comment_id}

Edit a comment. Only the comment author can edit.

**Body:** `{"body": "Updated comment text"}`

**Errors:** 403 — not comment author, 404 — comment not found.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/comments/{comment_id}

Delete a comment. Only the comment author can delete. **Response:** 204.

**Errors:** 403 — not comment author, 404 — comment not found.

## Search

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/search

Full-text search across work item titles and descriptions using PostgreSQL `tsvector`.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `q` | string | Search query (required, 1-200 chars) |
| `limit` | int | Max results (default 20, max 50) |

```bash
curl "https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/search?q=login+bug" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "item": {
      "id": 5,
      "item_number": 1,
      "title": "Fix login bug",
      "...": "..."
    },
    "headline": "Fix <mark>login</mark> <mark>bug</mark>",
    "rank": 0.075
  }
]
```

Results are ordered by relevance rank. The `headline` field contains the title with matching terms wrapped in `<mark>` tags.

## Custom Fields

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/fields

List all custom field definitions for a project. Ordered by position.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/fields \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "project_id": 1,
    "name": "Story Points",
    "field_type": "number",
    "options": null,
    "required": false,
    "position": 0
  },
  {
    "id": 2,
    "project_id": 1,
    "name": "Component",
    "field_type": "select",
    "options": {"choices": ["frontend", "backend", "infra"]},
    "required": true,
    "position": 1
  }
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/fields

Create a custom field definition. **Min role:** admin.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/fields \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Story Points", "field_type": "number", "required": false, "position": 0}'
```

**Field types:** `text`, `number`, `date`, `select`, `checkbox`

For `select` fields, provide options: `{"options": {"choices": ["opt1", "opt2"]}}`

**Response (201):** field definition object. **Errors:** 409 — name already exists in project.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/fields/{field_id}

Update a field definition. **Min role:** admin.

**Body:** `{"name": "...", "field_type": "...", "options": {...}, "required": true, "position": 2}`

All fields optional.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/fields/{field_id}

Delete a field definition and all its values. **Min role:** admin. **Response:** 204.

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/fields

Get all custom field values for a work item.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/fields \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "work_item_id": 5,
    "field_id": 1,
    "value_text": null,
    "value_number": 8.0,
    "value_date": null
  }
]
```

### PUT /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/fields/{field_id}

Set a custom field value on a work item. Creates or updates.

```bash
curl -X PUT https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/fields/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"value_number": 8}'
```

**Body fields (all optional, use the one matching the field type):**

| Field | Type | For field types |
|---|---|---|
| `value_text` | string | text, select, checkbox |
| `value_number` | float | number |
| `value_date` | date | date |

**Response (200):** field value object.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/fields/{field_id}

Clear a custom field value from a work item. **Response:** 204.

## Attachments

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments

List all attachments on a work item. Ordered newest first.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/attachments \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "work_item_id": 5,
    "filename": "screenshot.png",
    "content_type": "image/png",
    "size_bytes": 245000,
    "storage_key": "wit-attachments/abc123/screenshot.png",
    "uploaded_by_id": 1,
    "created_at": "2026-01-16T09:00:00Z"
  }
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments

Upload a file attachment. Max file size: 10 MB.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/attachments \
  -H "Authorization: Bearer <token>" \
  -F "file=@screenshot.png"
```

**Response (201):** attachment object. **Errors:** 413 — file too large.

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments/{attachment_id}/download

Download an attachment. Redirects (302) to a presigned S3 URL.

```bash
curl -L https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/attachments/1/download \
  -H "Authorization: Bearer <token>" \
  -o screenshot.png
```

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/attachments/{attachment_id}

Delete an attachment. Only the uploader can delete. **Response:** 204.

**Errors:** 403 — not the uploader, 404 — attachment not found.

## Invitations

### POST /api/workspaces/{ws_slug}/invites

Create an invitation link. **Min role:** admin.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/invites \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"role": "member", "expires_hours": 72, "max_uses": 10}'
```

**Body:**

| Field | Type | Default | Description |
|---|---|---|---|
| `role` | string | `"member"` | Role for invited users (`member` or `guest`) |
| `expires_hours` | int \| null | 72 | Hours until link expires (null = never) |
| `max_uses` | int \| null | null | Max number of uses (null = unlimited) |

**Response (201):**

```json
{
  "id": 1,
  "workspace_id": 1,
  "token": "abc123...",
  "role": "member",
  "created_by_id": 1,
  "expires_at": "2026-01-18T10:30:00Z",
  "max_uses": 10,
  "use_count": 0,
  "created_at": "2026-01-15T10:30:00Z"
}
```

Share the invite URL as: `https://wit.anulectra.com/invite/<token>`

### GET /api/workspaces/{ws_slug}/invites

List all invitation links for a workspace. **Min role:** admin.

**Response (200):** array of invite objects.

### DELETE /api/workspaces/{ws_slug}/invites/{invite_id}

Revoke an invitation link. **Min role:** admin. **Response:** 204.

### GET /api/invites/{token}

Get public info about an invite link. **Auth required:** No.

```bash
curl https://wit.anulectra.com/api/invites/abc123...
```

**Response (200):**

```json
{
  "workspace_name": "My Workspace",
  "role": "member"
}
```

**Errors:** 404 — not found, 410 — expired or max uses reached.

### POST /api/invites/{token}/accept

Accept an invitation and join the workspace.

```bash
curl -X POST https://wit.anulectra.com/api/invites/abc123.../accept \
  -H "Authorization: Bearer <token>"
```

**Response (201):** `{"ok": true}`

**Errors:** 409 — already a member, 410 — expired or max uses reached.

## Notifications

### GET /api/notifications

List notifications for the current user. Ordered newest first.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `read` | bool | Filter by read status (omit for all) |
| `limit` | int | Max results (default 50, max 200) |
| `offset` | int | Pagination offset (default 0) |

```bash
curl "https://wit.anulectra.com/api/notifications?read=false&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "user_id": 2,
    "work_item_id": 5,
    "event_type": "comment",
    "title": "New comment on #1: Fix login bug",
    "body": "Jane Doe commented: Looks good, merging now.",
    "read": false,
    "created_at": "2026-01-16T09:00:00Z"
  }
]
```

Notifications are created automatically when someone comments on, changes status of, or otherwise modifies a work item you are assigned to or created (excluding your own actions).

### GET /api/notifications/unread-count

Get the count of unread notifications.

**Response (200):**

```json
{"count": 3}
```

### PATCH /api/notifications/{notification_id}/read

Mark a single notification as read.

**Response (200):** `{"ok": true}`

### POST /api/notifications/read-all

Mark all notifications as read.

**Response (200):** `{"ok": true}`

## Webhooks

### GET /api/workspaces/{ws_slug}/webhooks

List all webhook configurations. **Min role:** admin.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/webhooks \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "workspace_id": 1,
    "url": "https://example.com/webhook",
    "event_types": {"include": ["comment", "status_change"]},
    "active": true
  }
]
```

### POST /api/workspaces/{ws_slug}/webhooks

Create a webhook. **Min role:** admin.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com/webhook", "event_types": {"include": ["comment", "status_change"]}, "active": true}'
```

**Body:**

| Field | Type | Default | Description |
|---|---|---|---|
| `url` | string | required | Webhook endpoint URL |
| `event_types` | object \| null | null | Filter events (null = all events) |
| `active` | bool | true | Whether the webhook is enabled |

**Response (201):** webhook config object.

When an activity event occurs in the workspace, WIT sends a POST request to each active webhook URL with the event payload (5 second timeout).

### PATCH /api/workspaces/{ws_slug}/webhooks/{webhook_id}

Update a webhook configuration. **Min role:** admin.

**Body:** `{"url": "...", "event_types": {...}, "active": false}` — all fields optional.

### DELETE /api/workspaces/{ws_slug}/webhooks/{webhook_id}

Delete a webhook. **Min role:** admin. **Response:** 204.

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
| 410 | Gone (invite expired or max uses reached) |
| 413 | Payload too large (file exceeds 10 MB) |

## Authentication Details

- **Algorithm:** HS256
- **Token expiry:** 72 hours (configurable via `JWT_EXPIRY_HOURS`)
- **Header format:** `Authorization: Bearer <token>`
