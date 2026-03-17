import datetime


def _items_url(ws_slug, project_slug):
    return f"/api/workspaces/{ws_slug}/projects/{project_slug}/items"


def test_create_item(client, project):
    ws, proj, headers = project
    resp = client.post(_items_url(ws, proj), headers=headers, json={
        "title": "Test item",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["item_number"] == 1
    assert data["title"] == "Test item"
    assert data["priority"] == "medium"


def test_list_items(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Item 1"})
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Item 2"})
    resp = client.get(_items_url(ws, proj), headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 2


def test_get_item_by_number(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Get me"})
    resp = client.get(f"{_items_url(ws, proj)}/1", headers=headers)
    assert resp.status_code == 200
    assert resp.json()["title"] == "Get me"


def test_update_item(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Original"})
    resp = client.patch(f"{_items_url(ws, proj)}/1", headers=headers, json={
        "title": "Updated",
        "priority": "high",
    })
    assert resp.status_code == 200
    assert resp.json()["title"] == "Updated"
    assert resp.json()["priority"] == "high"


def test_delete_item(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Delete me"})
    resp = client.delete(f"{_items_url(ws, proj)}/1", headers=headers)
    assert resp.status_code == 204
    resp = client.get(f"{_items_url(ws, proj)}/1", headers=headers)
    assert resp.status_code == 404


def test_add_assignee(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Assign"})
    me = client.get("/api/auth/me", headers=headers).json()
    resp = client.post(f"{_items_url(ws, proj)}/1/assignees/{me['id']}", headers=headers)
    assert resp.status_code == 201


def test_remove_assignee(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Unassign"})
    me = client.get("/api/auth/me", headers=headers).json()
    client.post(f"{_items_url(ws, proj)}/1/assignees/{me['id']}", headers=headers)
    resp = client.delete(f"{_items_url(ws, proj)}/1/assignees/{me['id']}", headers=headers)
    assert resp.status_code == 204


def test_add_label(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Label me"})
    label_resp = client.post(f"/api/workspaces/{ws}/projects/{proj}/labels", headers=headers, json={
        "name": "bug", "color": "#ef4444",
    })
    label_id = label_resp.json()["id"]
    resp = client.post(f"{_items_url(ws, proj)}/1/labels/{label_id}", headers=headers)
    assert resp.status_code == 201


def test_remove_label(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Unlabel me"})
    label_resp = client.post(f"/api/workspaces/{ws}/projects/{proj}/labels", headers=headers, json={
        "name": "feature", "color": "#10b981",
    })
    label_id = label_resp.json()["id"]
    client.post(f"{_items_url(ws, proj)}/1/labels/{label_id}", headers=headers)
    resp = client.delete(f"{_items_url(ws, proj)}/1/labels/{label_id}", headers=headers)
    assert resp.status_code == 204


def test_create_subtask(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Parent"})
    resp = client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={
        "title": "Subtask 1",
    })
    assert resp.status_code == 201
    assert resp.json()["title"] == "Subtask 1"
    assert resp.json()["position"] == 0


def test_subtask_position_auto_increments(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Parent"})
    client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub 1"})
    resp = client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub 2"})
    assert resp.json()["position"] == 1


def test_toggle_subtask_completed(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Parent"})
    sub = client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub"}).json()
    resp = client.patch(f"{_items_url(ws, proj)}/1/subtasks/{sub['id']}", headers=headers, json={
        "completed": True,
    })
    assert resp.status_code == 200
    assert resp.json()["completed"] is True


def test_delete_subtask(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Parent"})
    sub = client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub"}).json()
    resp = client.delete(f"{_items_url(ws, proj)}/1/subtasks/{sub['id']}", headers=headers)
    assert resp.status_code == 204


def test_item_includes_subtask_summary(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Parent"})
    client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub 1"})
    client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub 2"})
    resp = client.get(f"{_items_url(ws, proj)}/1", headers=headers)
    summary = resp.json()["subtask_summary"]
    assert summary["total"] == 2
    assert summary["completed"] == 0


def test_list_subtasks_ordered(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Parent"})
    client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub A"})
    client.post(f"{_items_url(ws, proj)}/1/subtasks", headers=headers, json={"title": "Sub B"})
    resp = client.get(f"{_items_url(ws, proj)}/1/subtasks", headers=headers)
    assert resp.status_code == 200
    subs = resp.json()
    assert len(subs) == 2
    assert subs[0]["position"] < subs[1]["position"]


def test_add_dependency(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Blocker"})
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Blocked"})
    resp = client.post(f"{_items_url(ws, proj)}/1/dependencies", headers=headers, json={
        "blocks_item_number": 2,
    })
    assert resp.status_code == 201


def test_self_dependency_rejected(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Self"})
    resp = client.post(f"{_items_url(ws, proj)}/1/dependencies", headers=headers, json={
        "blocks_item_number": 1,
    })
    assert resp.status_code == 400


def test_cycle_dependency_rejected(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "A"})
    client.post(_items_url(ws, proj), headers=headers, json={"title": "B"})
    # A blocks B
    client.post(f"{_items_url(ws, proj)}/1/dependencies", headers=headers, json={"blocks_item_number": 2})
    # B blocks A -> cycle
    resp = client.post(f"{_items_url(ws, proj)}/2/dependencies", headers=headers, json={"blocks_item_number": 1})
    assert resp.status_code == 409


def test_remove_dependency(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Blocker"})
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Blocked"})
    client.post(f"{_items_url(ws, proj)}/1/dependencies", headers=headers, json={"blocks_item_number": 2})
    resp = client.delete(f"{_items_url(ws, proj)}/1/dependencies/2", headers=headers)
    assert resp.status_code == 204


def test_filter_by_priority(client, project):
    ws, proj, headers = project
    client.post(_items_url(ws, proj), headers=headers, json={"title": "Low", "priority": "low"})
    client.post(_items_url(ws, proj), headers=headers, json={"title": "High", "priority": "high"})
    # List all and filter client-side (the API doesn't have a priority query param on list)
    resp = client.get(_items_url(ws, proj), headers=headers)
    items = resp.json()
    low_items = [i for i in items if i["priority"] == "low"]
    assert len(low_items) == 1
    assert low_items[0]["title"] == "Low"


def test_create_saved_view(client, project):
    ws, proj, headers = project
    resp = client.post(f"/api/workspaces/{ws}/projects/{proj}/views", headers=headers, json={
        "name": "My Filter",
        "filters": {"priority": "high"},
    })
    assert resp.status_code == 201
    assert resp.json()["name"] == "My Filter"


def test_list_saved_views(client, project):
    ws, proj, headers = project
    client.post(f"/api/workspaces/{ws}/projects/{proj}/views", headers=headers, json={
        "name": "View 1", "filters": {"priority": "high"},
    })
    resp = client.get(f"/api/workspaces/{ws}/projects/{proj}/views", headers=headers)
    assert resp.status_code == 200
    assert len(resp.json()) == 1


def test_delete_saved_view(client, project):
    ws, proj, headers = project
    view = client.post(f"/api/workspaces/{ws}/projects/{proj}/views", headers=headers, json={
        "name": "Delete me", "filters": {},
    }).json()
    resp = client.delete(f"/api/workspaces/{ws}/projects/{proj}/views/{view['id']}", headers=headers)
    assert resp.status_code == 204
