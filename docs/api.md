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

## Profile

### PATCH /api/profile

Update the current user's profile.

```bash
curl -X PATCH https://wit.anulectra.com/api/profile \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"display_name": "Jane Smith", "theme": "dark"}'
```

**Body:**

| Field | Type | Description |
|---|---|---|
| `display_name` | string | New display name |
| `theme` | string | `"dark"`, `"light"`, or `"system"` |
| `email_notifications` | bool | Enable/disable email notifications |
| `email_digest_mode` | string | `"immediate"` or `"daily"` |

All fields optional.

**Response (200):** user object with updated fields.

**Errors:** 400 — invalid theme value or digest mode.

### PUT /api/profile/password

Change the current user's password.

```bash
curl -X PUT https://wit.anulectra.com/api/profile/password \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"current_password": "old_password", "new_password": "new_secure_password"}'
```

**Response (200):**

```json
{"message": "Password updated"}
```

**Errors:** 400 — current password incorrect, or new password less than 8 characters.

## API Tokens

### POST /api/profile/tokens

Create a new API token. The raw token is only returned once.

```bash
curl -X POST https://wit.anulectra.com/api/profile/tokens \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "CI Pipeline", "expires_in_days": 90}'
```

**Body:**

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | string | required | Human-readable token name |
| `expires_in_days` | int \| null | 30 | Days until expiry (null = never) |

**Response (201):**

```json
{
  "id": 1,
  "name": "CI Pipeline",
  "token": "wit_abc123...",
  "token_prefix": "wit_abc12345",
  "expires_at": "2026-06-15T10:30:00Z",
  "created_at": "2026-03-17T10:30:00Z"
}
```

Save the `token` value — it cannot be retrieved again.

### GET /api/profile/tokens

List all API tokens for the current user. Only the prefix is shown.

```bash
curl https://wit.anulectra.com/api/profile/tokens \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "name": "CI Pipeline",
    "token_prefix": "wit_abc12345",
    "expires_at": "2026-06-15T10:30:00Z",
    "last_used_at": "2026-03-17T12:00:00Z",
    "created_at": "2026-03-17T10:30:00Z"
  }
]
```

### DELETE /api/profile/tokens/{token_id}

Revoke an API token. **Response:** 204.

**Errors:** 404 — token not found or belongs to another user.

## Item Dependencies

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/dependencies

List all dependencies for a work item.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/dependencies \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
{
  "blocks": [
    {"item_id": 10, "item_number": 3, "title": "Deploy to production"}
  ],
  "blocked_by": [
    {"item_id": 8, "item_number": 2, "title": "Write tests"}
  ]
}
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/dependencies

Add a dependency. The current item will block the specified item.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/dependencies \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"blocks_item_number": 3}'
```

**Response (201):** `{"ok": true}`

**Errors:** 400 — self-dependency, 404 — item not found, 409 — dependency already exists or would create a cycle.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/dependencies/{related_item_number}

Remove a dependency (in either direction) between two items. **Response:** 204.

**Errors:** 404 — item or dependency not found.

## Subtasks

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks

List all subtasks for a work item. Ordered by position.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/subtasks \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "work_item_id": 5,
    "title": "Write unit tests",
    "completed": false,
    "position": 0,
    "created_at": "2026-03-17T10:30:00Z"
  },
  {
    "id": 2,
    "work_item_id": 5,
    "title": "Update docs",
    "completed": true,
    "position": 1,
    "created_at": "2026-03-17T10:31:00Z"
  }
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks

Create a subtask. Position auto-increments.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/subtasks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title": "Write unit tests"}'
```

**Response (201):** subtask object.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks/{subtask_id}

Update a subtask. All fields optional.

```bash
curl -X PATCH https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/subtasks/1 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

**Body:** `{"title": "...", "completed": true, "position": 2}` — all optional.

**Response (200):** updated subtask object. Records activity when completed status changes.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/subtasks/{subtask_id}

Delete a subtask. **Response:** 204.

**Errors:** 404 — subtask not found.

## Watchers

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/watch

Get watch status for the current user on a work item.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/watch \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
{"watching": true, "watcher_count": 3}
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/watch

Start watching a work item. Watchers receive notifications for all activity. Idempotent.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/items/1/watch \
  -H "Authorization: Bearer <token>"
```

**Response (200):** watch status object.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/watch

Stop watching a work item. Idempotent.

**Response (200):** watch status object.

## Item Templates

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/templates

List all item templates in a project.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/templates \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "project_id": 1,
    "name": "Bug Report",
    "title_template": "[Bug] ",
    "description_template": "## Steps to reproduce\n\n## Expected behavior\n\n## Actual behavior",
    "priority": "high",
    "label_ids": [1],
    "created_at": "2026-03-17T10:30:00Z"
  }
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/templates

Create an item template.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/templates \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Bug Report", "title_template": "[Bug] ", "description_template": "## Steps\n\n## Expected\n\n## Actual", "priority": "high", "label_ids": [1]}'
```

**Response (201):** template object.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/templates/{template_id}

Update an item template. All fields optional.

**Body:** `{"name": "...", "title_template": "...", "description_template": "...", "priority": "...", "label_ids": [...]}`

**Response (200):** updated template object. **Errors:** 404 — template not found.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/templates/{template_id}

Delete an item template. **Response:** 204.

**Errors:** 404 — template not found.

## Automation Rules

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/automations

List all automation rules in a project.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/automations \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "project_id": 1,
    "name": "Auto-assign on In Progress",
    "trigger": "status_enter",
    "trigger_state_id": 2,
    "action": "assign_user",
    "action_config": {"user_id": 1},
    "enabled": true,
    "created_at": "2026-03-17T10:30:00Z"
  }
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/automations

Create an automation rule. **Min role:** admin.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/automations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Auto-assign", "trigger": "status_enter", "trigger_state_id": 2, "action": "assign_user", "action_config": {"user_id": 1}}'
```

**Triggers:** `status_enter` — fires when an item enters a specific state.

**Actions:**

| Action | Config | Description |
|---|---|---|
| `assign_user` | `{"user_id": <id>}` | Assign a user to the item |
| `add_label` | `{"label_id": <id>}` | Add a label to the item |
| `set_priority` | `{"priority": "<level>"}` | Change item priority |

**Response (201):** automation rule object.

### PATCH /api/workspaces/{ws_slug}/projects/{project_slug}/automations/{rule_id}

Update an automation rule. **Min role:** admin. All fields optional.

**Response (200):** updated rule object. **Errors:** 404 — rule not found.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/automations/{rule_id}

Delete an automation rule. **Min role:** admin. **Response:** 204.

**Errors:** 404 — rule not found.

## Insights

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/insights

Get project analytics including status/priority distribution, burndown chart, cycle time, and member breakdown.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/insights \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
{
  "status_distribution": [
    {"state_id": 1, "state_name": "Open", "category": "todo", "color": "#6b7280", "count": 5}
  ],
  "priority_distribution": [
    {"priority": "high", "count": 3},
    {"priority": "medium", "count": 8}
  ],
  "burndown": [
    {"date": "2026-02-15", "remaining": 12},
    {"date": "2026-02-16", "remaining": 11}
  ],
  "cycle_time": {"avg_days": 3.2, "median_days": 2.5, "count": 15},
  "member_breakdown": [
    {"user_id": 1, "display_name": "Jane Doe", "items_created": 10, "items_completed": 7, "items_assigned": 12}
  ],
  "recently_completed": [
    {"item_number": 42, "title": "Fix login bug", "completed_at": "2026-03-16T14:00:00Z", "completed_by": "Jane Doe"}
  ]
}
```

### GET /api/workspaces/{ws_slug}/insights

Get workspace-level insights. **Min role:** admin.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/insights \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
{
  "project_summaries": [
    {"project_id": 1, "project_name": "Web App", "project_slug": "web-app", "total_items": 42, "completed_items": 28, "completion_rate": 66.7}
  ],
  "most_active_members": [
    {"user_id": 1, "display_name": "Jane Doe", "events_count": 150}
  ],
  "activity_trend": [
    {"date": "2026-02-15", "count": 12}
  ]
}
```

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/export.csv

Export all non-archived work items as CSV. **Min role:** member.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/export.csv \
  -H "Authorization: Bearer <token>" \
  -o items.csv
```

**Response (200):** CSV file with columns: `item_number`, `title`, `description`, `status`, `priority`, `due_date`, `created_by`, `created_at`, `assignees`, `labels`.

**Content-Type:** `text/csv` with `Content-Disposition: attachment; filename=<project_slug>-items.csv`.

## Saved Views

### GET /api/workspaces/{ws_slug}/projects/{project_slug}/views

List saved filter views for the current user in a project.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/views \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "project_id": 1,
    "user_id": 1,
    "name": "My High Priority",
    "filters": {"priority": "high", "status": "in_progress"},
    "created_at": "2026-03-17T10:30:00Z"
  }
]
```

### POST /api/workspaces/{ws_slug}/projects/{project_slug}/views

Create a saved view.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/projects/web-app/views \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "High Priority", "filters": {"priority": "high"}}'
```

**Response (201):** saved view object. **Errors:** 409 — view name already exists for this user in this project.

### DELETE /api/workspaces/{ws_slug}/projects/{project_slug}/views/{view_id}

Delete a saved view. Only the view owner can delete. **Response:** 204.

**Errors:** 404 — view not found.

## Bulk Operations

**Min role:** admin for all bulk operations.

### POST /api/workspaces/{ws_slug}/bulk/archive

Archive multiple work items.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/bulk/archive \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"item_ids": [1, 2, 3]}'
```

**Response (200):**

```json
{"affected": 3}
```

### POST /api/workspaces/{ws_slug}/bulk/reassign

Add an assignee to multiple work items.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/bulk/reassign \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"item_ids": [1, 2, 3], "assignee_id": 5}'
```

**Response (200):** `{"affected": 3}` — count of items where the assignee was added (skips already assigned).

**Errors:** 400 — assignee is not a workspace member.

### POST /api/workspaces/{ws_slug}/bulk/labels

Add or remove a label from multiple work items.

```bash
curl -X POST https://wit.anulectra.com/api/workspaces/my-workspace/bulk/labels \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"item_ids": [1, 2, 3], "label_id": 1, "action": "add"}'
```

**Body:** `action` must be `"add"` or `"remove"`.

**Response (200):** `{"affected": 3}`

**Errors:** 400 — invalid action, 404 — label not found.

## Cross-Project View

### GET /api/workspaces/{ws_slug}/items

List work items across all projects in a workspace.

**Query parameters:**

| Param | Type | Description |
|---|---|---|
| `category` | string | Filter by state category (`todo`, `in_progress`, `done`) |
| `priority` | string | Filter by priority |
| `limit` | int | Max results (default 200) |

```bash
curl "https://wit.anulectra.com/api/workspaces/my-workspace/items?category=in_progress&priority=high" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 5,
    "project_id": 1,
    "project_name": "Web App",
    "project_slug": "web-app",
    "item_number": 1,
    "title": "Fix login bug",
    "description": "...",
    "status_name": "In Progress",
    "status_category": "in_progress",
    "status_color": "#3b82f6",
    "priority": "high",
    "due_date": "2026-04-01",
    "created_at": "2026-01-15T10:30:00Z",
    "assignee_names": ["Jane Doe"]
  }
]
```

## Workspace Stats

### GET /api/workspaces/{ws_slug}/stats

Get workspace statistics. **Min role:** admin.

```bash
curl https://wit.anulectra.com/api/workspaces/my-workspace/stats \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
{
  "items_total": 42,
  "items_last_7d": 5,
  "active_members": 8,
  "attachment_count": 15,
  "storage_bytes": 52428800
}
```

### GET /api/workspaces/{ws_slug}/audit

Get workspace activity audit log. **Min role:** admin.

**Query parameters:** `event_type` (filter by type), `limit` (default 50), `offset` (default 0).

```bash
curl "https://wit.anulectra.com/api/workspaces/my-workspace/audit?event_type=status_change&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response (200):** array of activity event objects (same format as Activity & Comments).

## Members

### GET /api/workspaces/{ws_slug}/members/search

Search workspace members by display name. Used for @mention autocomplete.

**Query parameters:** `q` — name prefix (optional).

```bash
curl "https://wit.anulectra.com/api/workspaces/my-workspace/members/search?q=jan" \
  -H "Authorization: Bearer <token>"
```

**Response (200):** array of user objects (max 10 results).

## Admin

All admin endpoints require superuser access (`is_superuser: true`).

### GET /api/admin/dashboard

Get system-wide statistics.

```bash
curl https://wit.anulectra.com/api/admin/dashboard \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
{
  "total_users": 25,
  "active_users": 23,
  "total_workspaces": 8,
  "total_items": 342,
  "signups_last_7d": 3
}
```

### GET /api/admin/users

List all users with workspace counts.

**Query parameters:** `search` (email or name), `limit` (default 50), `offset` (default 0).

```bash
curl "https://wit.anulectra.com/api/admin/users?search=jane&limit=10" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "email": "jane@example.com",
    "display_name": "Jane Doe",
    "is_superuser": true,
    "is_active": true,
    "created_at": "2026-01-15T10:30:00Z",
    "workspace_count": 3
  }
]
```

### PATCH /api/admin/users/{user_id}

Update a user's superuser or active status. Creates an audit log entry.

```bash
curl -X PATCH https://wit.anulectra.com/api/admin/users/2 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"is_active": false}'
```

**Body:** `{"is_active": true/false, "is_superuser": true/false}` — both optional.

**Response (200):** admin user object. **Errors:** 400 — cannot deactivate yourself, 404 — user not found.

### GET /api/admin/workspaces

List all workspaces with member, project, and item counts.

**Query parameters:** `search` (name or slug), `limit` (default 50), `offset` (default 0).

```bash
curl https://wit.anulectra.com/api/admin/workspaces \
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
    "member_count": 5,
    "project_count": 3,
    "item_count": 42
  }
]
```

### GET /api/admin/workspaces/{workspace_id}/members

List members of a workspace (admin view).

**Response (200):** array of member objects with `user_id`, `email`, `display_name`, `role`.

### DELETE /api/admin/workspaces/{workspace_id}

Delete a workspace and all associated data. Creates an audit log entry. **Response:** 204.

### GET /api/admin/audit-log

List admin audit log entries.

**Query parameters:** `entity_type` (e.g. "user", "workspace"), `action` (e.g. "user.deactivated"), `limit` (default 50), `offset` (default 0).

```bash
curl "https://wit.anulectra.com/api/admin/audit-log?entity_type=user&limit=20" \
  -H "Authorization: Bearer <token>"
```

**Response (200):**

```json
[
  {
    "id": 1,
    "actor_id": 1,
    "action": "user.deactivated",
    "entity_type": "user",
    "entity_id": 2,
    "details": {"is_active": {"old": true, "new": false}},
    "created_at": "2026-03-17T10:30:00Z",
    "actor": {"id": 1, "email": "admin@example.com", "display_name": "Admin", "is_superuser": true, "created_at": "..."}
  }
]
```

## WebSocket

### WS /ws/board/{project_id}?token=<jwt>

Real-time board updates via WebSocket.

**Authentication:** Pass JWT token as `token` query parameter.

```javascript
const ws = new WebSocket("wss://wit.anulectra.com/ws/board/1?token=<jwt>");

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // data.type: "item_created" | "item_updated" | "item_deleted" | "presence"
  console.log(data);
};
```

**Message types:**

| Type | Fields | Description |
|---|---|---|
| `item_created` | `item_number` | New item added to board |
| `item_updated` | `item_number` | Item modified (status, assignee, label, etc.) |
| `item_deleted` | `item_number` | Item removed from board |
| `presence` | `users[]` | Active users on the board |

**Close codes:** 4001 — invalid/missing token, 4003 — not a workspace member, 4004 — project not found.

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

**User preferences:** Each user has `theme` (dark/light/system), `email_notifications` (bool), and `email_digest_mode` (immediate/daily) settings, configurable via `PATCH /api/profile`.

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
- **API tokens:** Persistent tokens with `wit_` prefix. Created via `POST /api/profile/tokens`. Stored as SHA256 hash. Can have configurable expiry or be permanent.
- **Dual auth:** Endpoints accept both JWT tokens and API tokens. API tokens are identified by the `wit_` prefix.
