import datetime

from app.automation import (
    process_due_date_automations,
    run_label_automations,
    run_status_automations,
)
from app.models import (
    ActivityEvent,
    AutomationLog,
    AutomationRule,
    Label,
    Notification,
    Project,
    User,
    WorkflowState,
    WorkItem,
    WorkItemAssignee,
    WorkItemDependency,
    WorkItemLabel,
    Workspace,
    WorkspaceMember,
)


def _seed(db):
    """Create a workspace, project, user, and two workflow states."""
    user = User(
        email="auto@test.com", display_name="Bot", password_hash="x" * 60
    )
    db.add(user)
    db.flush()

    ws = Workspace(name="WS", slug="ws")
    db.add(ws)
    db.flush()

    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner"))

    project = Project(
        workspace_id=ws.id, name="P", slug="p", item_counter=0
    )
    db.add(project)
    db.flush()

    todo = WorkflowState(
        project_id=project.id, name="Todo", category="todo", position=0
    )
    done = WorkflowState(
        project_id=project.id, name="Done", category="done", position=1
    )
    db.add_all([todo, done])
    db.flush()

    project.item_counter = 1
    item = WorkItem(
        project_id=project.id,
        item_number=1,
        title="Test Item",
        status_id=todo.id,
        created_by_id=user.id,
    )
    db.add(item)
    db.flush()

    return user, project, todo, done, item


def test_status_enter_assign_user(db):
    user, project, todo, done, item = _seed(db)

    rule = AutomationRule(
        project_id=project.id,
        name="Auto-assign on Done",
        trigger="status_enter",
        trigger_state_id=done.id,
        action="assign_user",
        action_config={"user_id": user.id},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    run_status_automations(db, item, done.id, user.id)
    db.flush()

    assignee = db.query(WorkItemAssignee).filter_by(
        work_item_id=item.id, user_id=user.id
    ).first()
    assert assignee is not None


def test_label_added_trigger_fires(db):
    user, project, todo, done, item = _seed(db)

    label = Label(project_id=project.id, name="bug", color="#ff0000")
    db.add(label)
    db.flush()

    rule = AutomationRule(
        project_id=project.id,
        name="Bug -> assign",
        trigger="label_added",
        trigger_config={"label_id": label.id},
        action="assign_user",
        action_config={"user_id": user.id},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    run_label_automations(db, item, label.id, user.id)
    db.flush()

    assignee = db.query(WorkItemAssignee).filter_by(
        work_item_id=item.id, user_id=user.id
    ).first()
    assert assignee is not None


def test_label_added_wrong_label_no_fire(db):
    user, project, todo, done, item = _seed(db)

    bug_label = Label(project_id=project.id, name="bug", color="#ff0000")
    feat_label = Label(project_id=project.id, name="feature", color="#00ff00")
    db.add_all([bug_label, feat_label])
    db.flush()

    rule = AutomationRule(
        project_id=project.id,
        name="Bug -> assign",
        trigger="label_added",
        trigger_config={"label_id": bug_label.id},
        action="assign_user",
        action_config={"user_id": user.id},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    run_label_automations(db, item, feat_label.id, user.id)
    db.flush()

    assignee = db.query(WorkItemAssignee).filter_by(
        work_item_id=item.id, user_id=user.id
    ).first()
    assert assignee is None


def test_move_to_state_action(db):
    user, project, todo, done, item = _seed(db)

    rule = AutomationRule(
        project_id=project.id,
        name="Auto-close",
        trigger="status_enter",
        trigger_state_id=todo.id,
        action="move_to_state",
        action_config={"state_id": done.id},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    run_status_automations(db, item, todo.id, user.id)
    db.flush()

    assert item.status_id == done.id
    activity = (
        db.query(ActivityEvent)
        .filter_by(work_item_id=item.id, event_type="status_change")
        .first()
    )
    assert activity is not None
    assert activity.new_value == "Done"


def test_move_to_state_no_loop(db):
    """move_to_state from a status_enter trigger should not recurse."""
    user, project, todo, done, item = _seed(db)

    # Rule 1: entering Todo -> move to Done
    rule1 = AutomationRule(
        project_id=project.id,
        name="Auto-close",
        trigger="status_enter",
        trigger_state_id=todo.id,
        action="move_to_state",
        action_config={"state_id": done.id},
        enabled=True,
    )
    # Rule 2: entering Done -> move to Todo (would loop if recursive)
    rule2 = AutomationRule(
        project_id=project.id,
        name="Auto-reopen",
        trigger="status_enter",
        trigger_state_id=done.id,
        action="move_to_state",
        action_config={"state_id": todo.id},
        enabled=True,
    )
    db.add_all([rule1, rule2])
    db.flush()

    run_status_automations(db, item, todo.id, user.id)
    db.flush()

    # Should move to Done (rule1 fires), but rule2 should NOT fire
    assert item.status_id == done.id


def test_notify_user_action(db):
    user, project, todo, done, item = _seed(db)

    rule = AutomationRule(
        project_id=project.id,
        name="Notify on done",
        trigger="status_enter",
        trigger_state_id=done.id,
        action="notify_user",
        action_config={"user_id": user.id, "message": "Item completed!"},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    run_status_automations(db, item, done.id, user.id)
    db.flush()

    notif = db.query(Notification).filter_by(user_id=user.id, event_type="automation").first()
    assert notif is not None
    assert "Test Item" in notif.title
    assert notif.body == "Item completed!"


def test_create_linked_item_action(db):
    user, project, todo, done, item = _seed(db)

    rule = AutomationRule(
        project_id=project.id,
        name="Create follow-up",
        trigger="status_enter",
        trigger_state_id=done.id,
        action="create_linked_item",
        action_config={"title": "Follow-up task", "state_id": todo.id, "priority": "high"},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    run_status_automations(db, item, done.id, user.id)
    db.flush()

    new_item = db.query(WorkItem).filter_by(project_id=project.id, item_number=2).first()
    assert new_item is not None
    assert new_item.title == "Follow-up task"
    assert new_item.priority == "high"
    assert new_item.status_id == todo.id

    dep = db.query(WorkItemDependency).filter_by(
        blocking_item_id=new_item.id, blocked_item_id=item.id
    ).first()
    assert dep is not None


def test_due_date_approaching_fires(db):
    user, project, todo, done, item = _seed(db)

    item.due_date = datetime.date.today() + datetime.timedelta(days=1)

    rule = AutomationRule(
        project_id=project.id,
        name="Due soon notify",
        trigger="due_date_approaching",
        trigger_config={"days_before": 3},
        action="notify_user",
        action_config={"user_id": user.id, "message": "Due soon!"},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    count = process_due_date_automations(db)
    db.flush()

    assert count == 1
    notif = db.query(Notification).filter_by(user_id=user.id, event_type="automation").first()
    assert notif is not None


def test_due_date_approaching_dedup(db):
    user, project, todo, done, item = _seed(db)

    item.due_date = datetime.date.today() + datetime.timedelta(days=1)

    rule = AutomationRule(
        project_id=project.id,
        name="Due soon notify",
        trigger="due_date_approaching",
        trigger_config={"days_before": 3},
        action="notify_user",
        action_config={"user_id": user.id, "message": "Due soon!"},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    count1 = process_due_date_automations(db)
    db.flush()
    count2 = process_due_date_automations(db)
    db.flush()

    assert count1 == 1
    assert count2 == 0
    assert db.query(Notification).filter_by(event_type="automation").count() == 1


def test_due_date_approaching_not_yet(db):
    user, project, todo, done, item = _seed(db)

    item.due_date = datetime.date.today() + datetime.timedelta(days=30)

    rule = AutomationRule(
        project_id=project.id,
        name="Due soon notify",
        trigger="due_date_approaching",
        trigger_config={"days_before": 3},
        action="notify_user",
        action_config={"user_id": user.id, "message": "Due soon!"},
        enabled=True,
    )
    db.add(rule)
    db.flush()

    count = process_due_date_automations(db)
    db.flush()

    assert count == 0


def test_disabled_rule_skipped(db):
    user, project, todo, done, item = _seed(db)

    rule = AutomationRule(
        project_id=project.id,
        name="Disabled rule",
        trigger="status_enter",
        trigger_state_id=done.id,
        action="assign_user",
        action_config={"user_id": user.id},
        enabled=False,
    )
    db.add(rule)
    db.flush()

    run_status_automations(db, item, done.id, user.id)
    db.flush()

    assignee = db.query(WorkItemAssignee).filter_by(
        work_item_id=item.id, user_id=user.id
    ).first()
    assert assignee is None


def test_trigger_config_crud(client, auth_headers):
    # Create workspace + project
    resp = client.get("/api/workspaces", headers=auth_headers)
    ws_slug = resp.json()[0]["slug"]
    client.post(f"/api/workspaces/{ws_slug}/projects", headers=auth_headers, json={
        "name": "Auto Test", "slug": "auto-test", "template": "software",
    })
    base = f"/api/workspaces/{ws_slug}/projects/auto-test"

    # Create label
    label_resp = client.post(f"{base}/labels", headers=auth_headers, json={
        "name": "urgent-bug", "color": "#ff0000",
    })
    label_id = label_resp.json()["id"]

    # Create rule with trigger_config
    rule_resp = client.post(f"{base}/automations", headers=auth_headers, json={
        "name": "Label trigger test",
        "trigger": "label_added",
        "trigger_config": {"label_id": label_id},
        "action": "set_priority",
        "action_config": {"priority": "urgent"},
    })
    assert rule_resp.status_code == 201
    rule = rule_resp.json()
    assert rule["trigger_config"] == {"label_id": label_id}
    assert rule["trigger"] == "label_added"

    # Read
    list_resp = client.get(f"{base}/automations", headers=auth_headers)
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["trigger_config"] == {"label_id": label_id}

    # Update trigger_config
    update_resp = client.patch(
        f"{base}/automations/{rule['id']}", headers=auth_headers,
        json={"trigger_config": {"label_id": 999}},
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["trigger_config"] == {"label_id": 999}
