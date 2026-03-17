"""Tests for team workload endpoints."""


def _create_project_with_states(client, ws_slug, headers):
    """Create a project and return (project_slug, state_ids_by_category)."""
    resp = client.post(
        f"/api/workspaces/{ws_slug}/projects",
        headers=headers,
        json={"name": "WL Project", "slug": "wl-project", "template": "software"},
    )
    assert resp.status_code == 201

    states_resp = client.get(f"/api/workspaces/{ws_slug}/projects/wl-project/states", headers=headers)
    states = states_resp.json()
    by_cat = {}
    for s in states:
        by_cat.setdefault(s["category"], []).append(s["id"])
    return "wl-project", by_cat


def _create_item(client, ws_slug, project_slug, headers, title, status_id=None, story_points=None):
    body = {"title": title}
    if status_id:
        body["status_id"] = status_id
    if story_points is not None:
        body["story_points"] = story_points
    resp = client.post(
        f"/api/workspaces/{ws_slug}/projects/{project_slug}/items",
        headers=headers,
        json=body,
    )
    assert resp.status_code == 201
    return resp.json()


def _assign_item(client, ws_slug, project_slug, item_number, user_id, headers):
    resp = client.post(
        f"/api/workspaces/{ws_slug}/projects/{project_slug}/items/{item_number}/assignees/{user_id}",
        headers=headers,
    )
    assert resp.status_code in (200, 201)


def test_project_workload_empty(client, workspace):
    ws_slug, headers = workspace
    project_slug, _ = _create_project_with_states(client, ws_slug, headers)

    resp = client.get(
        f"/api/workspaces/{ws_slug}/projects/{project_slug}/workload",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["members"] == []
    assert data["total_items"] == 0
    assert data["total_points"] == 0


def test_project_workload_with_items(client, workspace):
    ws_slug, headers = workspace
    project_slug, states = _create_project_with_states(client, ws_slug, headers)

    # Get current user id
    me = client.get("/api/auth/me", headers=headers).json()
    user_id = me["id"]

    # Create items in different states
    todo_state = states["todo"][0]
    ip_state = states["in_progress"][0]

    item1 = _create_item(client, ws_slug, project_slug, headers, "Task 1", todo_state, story_points=3)
    item2 = _create_item(client, ws_slug, project_slug, headers, "Task 2", ip_state, story_points=5)

    _assign_item(client, ws_slug, project_slug, item1["item_number"], user_id, headers)
    _assign_item(client, ws_slug, project_slug, item2["item_number"], user_id, headers)

    resp = client.get(
        f"/api/workspaces/{ws_slug}/projects/{project_slug}/workload",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["members"]) == 1
    member = data["members"][0]
    assert member["user_id"] == user_id
    assert member["total_items"] == 2
    assert member["breakdown"]["todo_items"] == 1
    assert member["breakdown"]["in_progress_items"] == 1


def test_project_workload_points_aggregation(client, workspace):
    ws_slug, headers = workspace
    project_slug, states = _create_project_with_states(client, ws_slug, headers)

    me = client.get("/api/auth/me", headers=headers).json()
    user_id = me["id"]

    todo_state = states["todo"][0]
    item1 = _create_item(client, ws_slug, project_slug, headers, "A", todo_state, story_points=3)
    item2 = _create_item(client, ws_slug, project_slug, headers, "B", todo_state, story_points=5)
    item3 = _create_item(client, ws_slug, project_slug, headers, "C", todo_state)  # no points

    _assign_item(client, ws_slug, project_slug, item1["item_number"], user_id, headers)
    _assign_item(client, ws_slug, project_slug, item2["item_number"], user_id, headers)
    _assign_item(client, ws_slug, project_slug, item3["item_number"], user_id, headers)

    resp = client.get(
        f"/api/workspaces/{ws_slug}/projects/{project_slug}/workload",
        headers=headers,
    )
    assert resp.status_code == 200
    data = resp.json()
    member = data["members"][0]
    assert member["total_items"] == 3
    assert member["total_points"] == 8
    assert member["breakdown"]["todo_items"] == 3
    assert member["breakdown"]["todo_points"] == 8
    assert data["total_points"] == 8


def test_workspace_workload(client, workspace):
    ws_slug, headers = workspace
    project_slug, states = _create_project_with_states(client, ws_slug, headers)

    me = client.get("/api/auth/me", headers=headers).json()
    user_id = me["id"]

    todo_state = states["todo"][0]
    item1 = _create_item(client, ws_slug, project_slug, headers, "WS Task", todo_state, story_points=2)
    _assign_item(client, ws_slug, project_slug, item1["item_number"], user_id, headers)

    # Need admin role - the workspace creator is owner which satisfies admin
    resp = client.get(f"/api/workspaces/{ws_slug}/workload", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["user_id"] == user_id
    assert data[0]["total_items"] == 1
    assert data[0]["total_points"] == 2
    assert "WL Project" in data[0]["projects"]


def test_workspace_workload_requires_admin(client, auth_headers):
    # Register a second user
    resp = client.post("/api/auth/register", json={
        "email": "member@example.com",
        "display_name": "Member User",
        "password": "testpassword123",
    })
    assert resp.status_code == 201
    member_token = resp.json()["access_token"]
    member_headers = {"Authorization": f"Bearer {member_token}"}

    # Create workspace with first user (owner)
    ws_resp = client.get("/api/workspaces", headers=auth_headers)
    ws_slug = ws_resp.json()[0]["slug"]

    # Add second user as member
    client.post(
        f"/api/workspaces/{ws_slug}/members",
        headers=auth_headers,
        json={"email": "member@example.com", "role": "member"},
    )

    # Member should get 403 on workspace workload
    resp = client.get(f"/api/workspaces/{ws_slug}/workload", headers=member_headers)
    assert resp.status_code == 403
