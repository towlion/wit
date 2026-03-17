# WIT User Guide

WIT (Work Item Tracker) is a Kanban-style project management tool with workspaces, drag-and-drop boards, dependencies, automation, and real-time collaboration.

---

## Table of Contents

1. [Getting Started](#getting-started)
2. [Workspaces](#workspaces)
3. [Projects](#projects)
4. [The Kanban Board](#the-kanban-board)
5. [Work Items](#work-items)
6. [Views](#views)
7. [Search & Filtering](#search--filtering)
8. [Templates & Automation](#templates--automation)
9. [Notifications](#notifications)
10. [Analytics](#analytics)
11. [Keyboard Shortcuts](#keyboard-shortcuts)
12. [Personalization](#personalization)
13. [Administration](#administration)

---

## Getting Started

### Register & Log In

1. Navigate to your WIT instance and click **Sign up**.
2. Enter a display name, email, and password.
3. After registering, you are automatically logged in.

### Interface Overview

The main interface consists of:

- **Header** -- workspace navigation, theme toggle, notifications bell, help, and profile menu.
- **Sidebar** -- projects list, views, and settings for the current workspace.
- **Main area** -- the Kanban board (default), calendar, dependency graph, or other views.

### Quick Start Flow

1. Create a **workspace** (or accept an invitation to one).
2. Create a **project** within the workspace.
3. Add **work items** to the board by typing in the quick-create input or pressing `n`.
4. Drag items between columns to update their status.

---

## Workspaces

A workspace is the top-level container. Each workspace has its own projects, members, and settings.

### Creating a Workspace

Click the **+** button in the header or navigate to the home page and click **Create workspace**. Provide a name -- a URL-friendly slug is generated automatically.

### Roles

| Role | Capabilities |
|------|-------------|
| **Owner** | Full control, can delete workspace, manage all members |
| **Admin** | Manage projects, members (except owner), and settings |
| **Member** | Create and edit items, comment, manage own assignments |
| **Guest** | View-only access to invited projects |

### Invitations

Owners and admins can invite users by email. The invitation creates a link that the recipient can use to join. Pending invitations appear in workspace settings.

---

## Projects

Projects live inside workspaces and contain work items organized on a board.

### Creating a Project

From the workspace sidebar, click **New project**. Choose from three templates:

- **Software** -- states: Backlog, To Do, In Progress, Review, Done
- **Home** -- states: Ideas, To Do, In Progress, Complete
- **Event** -- states: Planning, Preparation, Active, Wrap-up, Done

You can customize states and labels after creation.

### Project Settings

Access via the gear icon on the project page:

- **States** -- add, rename, reorder, or delete status columns
- **Labels** -- create colored labels for categorization
- **Board settings** -- swimlanes, WIP limits, card display options

---

## The Kanban Board

The board is the primary view. Each column represents a status state, and cards represent work items.

### Drag and Drop

Drag cards between columns to change their status. Cards can also be reordered within a column.

### Card Anatomy

Each card on the board shows:

- **Title** -- the item name
- **Priority** -- color-coded indicator (critical, high, medium, low, none)
- **Assignees** -- avatar circles for assigned members
- **Labels** -- colored tags
- **Due date** -- shown if set, highlighted when overdue
- **Subtask progress** -- a small progress badge (e.g., 2/5)
- **Dependency indicator** -- shown if the item has blockers

### Board Settings

Accessible from the project settings:

- **Swimlanes** -- group rows by priority, assignee, or label
- **WIP limits** -- set maximum items per column; the column header highlights when exceeded
- **Card display** -- toggle visibility of labels, assignees, due dates, and subtask progress on cards

---

## Work Items

Click a card on the board (or press `Enter` on a selected card) to open the detail view.

### Fields

| Field | Description |
|-------|-------------|
| **Title** | Item name (click to edit inline) |
| **Description** | Markdown-formatted text with full editor support |
| **Status** | Current state (matches board column) |
| **Priority** | Critical, High, Medium, Low, or None |
| **Assignees** | One or more workspace members |
| **Labels** | Project-defined colored tags |
| **Due date** | Optional deadline with calendar picker |
| **Custom fields** | Workspace-defined fields (text, number, date, select) |

### Subtasks / Checklists

Add subtasks within an item to break work into smaller pieces. Each subtask has a title and completion checkbox. The board card shows a progress badge.

### Attachments

Attach files up to **10 MB** each. Files are stored in S3-compatible object storage (MinIO). Click an attachment to download it.

### Dependencies

Items can depend on other items:

- **Blocked by** -- this item cannot proceed until the blocker is done
- **Blocks** -- this item is blocking another item

Dependencies are visualized in the [dependency graph view](#views).

### Activity Feed & Comments

The detail panel shows a chronological activity feed:

- Status changes, assignment updates, field edits
- **Comments** -- add comments with markdown formatting; use **@mentions** to notify team members
- **Watching** -- click the eye icon to watch an item and receive notifications on changes

---

## Views

WIT offers multiple ways to visualize your work:

### Board View (Default)

The Kanban board with drag-and-drop columns. See [The Kanban Board](#the-kanban-board).

### Calendar View

Displays items with due dates on a monthly calendar grid. Click a date to see items due that day.

### Dependency Graph

A directed acyclic graph (DAG) visualization of item dependencies. Features:

- Pan and zoom with mouse/trackpad
- Minimap for orientation in large graphs
- Click a node to open the item detail
- Color-coded by item status

### Cross-Project Board

View items from multiple projects in a single unified board. Access from the workspace sidebar under **All projects**.

---

## Search & Filtering

### Quick Search (Cmd+K)

Press `Cmd+K` (or `Ctrl+K`) to open the search palette. Type to search across all items in the current workspace by title. Results appear instantly with full-text search powered by PostgreSQL tsvector indexes.

### Filter Bar

The filter bar at the top of the board lets you filter by:

- **Status** -- one or more states
- **Assignee** -- specific members or unassigned
- **Label** -- one or more labels
- **Priority** -- priority levels
- **Date range** -- due date within a range

Filters are combined with AND logic. Active filters are shown as removable chips.

### Saved Views

Save a combination of filters as a named view for quick access later. Saved views appear in the sidebar and can be shared with the workspace. Filter state is also persisted in the URL for easy sharing.

---

## Templates & Automation

### Item Templates

Create reusable templates for common item types (e.g., "Bug Report", "Feature Request"). Templates pre-fill:

- Title prefix
- Description (markdown template)
- Priority
- Labels
- Custom field values

Create and manage templates from the project settings.

### Automation Rules

Set up rules that trigger automatically when an item's status changes:

- **Trigger**: item moves to a specific status
- **Action**: assign a member, set a label, change priority, or add a comment

Example: "When status changes to Review, assign to @reviewer"

Manage automation rules from the project settings.

---

## Notifications

### In-App Notifications

Click the bell icon in the header to see your notifications. You receive notifications when:

- You are assigned to an item
- Someone comments on an item you're watching
- You are @mentioned in a comment
- An item you're watching changes status

### Email Notifications

Email notifications are **opt-in**. Enable them from your [profile settings](#personalization):

- **Immediate** -- receive an email for each notification
- **Daily digest** -- receive a single daily summary email

Rate limited to 1 email per hour per item to avoid flooding.

### Webhooks

Workspace admins can configure webhooks to send event payloads to external URLs. Useful for integrating with Slack, Discord, or custom systems.

---

## Analytics

### Project Insights

Access from the chart icon on the project page. Available reports:

- **Status distribution** -- pie chart of items by status
- **Priority distribution** -- bar chart of items by priority level
- **Burndown chart** -- tracks remaining items over time
- **Cycle time** -- average time items spend in each status
- **Member breakdown** -- items and completions per team member

### CSV Export

Export project data as CSV for use in spreadsheets or external tools. Available from the project insights page.

### Workspace Insights

Workspace-level analytics showing aggregate metrics across all projects: total items, completion rates, and activity trends.

---

## Keyboard Shortcuts

Press `?` on any board view to see the shortcuts modal.

| Shortcut | Action |
|----------|--------|
| `n` | New item (focus quick create) |
| `j` | Next card |
| `k` | Previous card |
| `Enter` | Open selected card |
| `Escape` | Close panel / deselect |
| `e` | Edit description (in detail) |
| `Cmd+K` | Search |
| `?` | Show keyboard shortcuts |

Shortcuts that don't use `Cmd`/`Ctrl` are disabled when a text input is focused.

---

## Personalization

### Theme

Toggle between **Dark**, **Light**, and **System** themes using the theme button in the header (sun/moon/monitor icon). Your preference is saved to your profile.

### Profile Settings

Access from the profile dropdown in the header:

- **Display name** -- how your name appears to others
- **Email** -- your account email
- **Email notifications** -- toggle and set digest mode
- **Password** -- change your password

### API Tokens

Generate personal API tokens from your profile settings for programmatic access. Tokens can be set with a configurable expiry. Revoke tokens at any time.

---

## Administration

**Admin features are only available to superusers.**

Access the admin panel via the shield icon in the header.

### Dashboard

Overview of system-wide metrics: total users, workspaces, items, and recent activity.

### User Management

View all users, toggle active/inactive status, and grant or revoke superuser privileges.

### Workspace Management

View all workspaces with member counts, item counts, and storage usage.

### Audit Log

Chronological log of administrative actions (user changes, workspace modifications, permission updates) for compliance and debugging.
