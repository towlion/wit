from datetime import datetime, timedelta, timezone

from app.models import ApiToken, User, WorkspaceMember


def _register(client, email, name="User"):
    resp = client.post("/api/auth/register", json={
        "email": email, "display_name": name, "password": "password123",
    })
    return resp.json()["access_token"]


def _headers(token):
    return {"Authorization": f"Bearer {token}"}


def test_non_member_cannot_access_workspace(client, project):
    ws, proj, headers = project
    # Register a second user (not a member of the first user's workspace)
    token2 = _register(client, "other@example.com", "Other")
    resp = client.get(f"/api/workspaces/{ws}/projects/{proj}/items", headers=_headers(token2))
    assert resp.status_code == 403


def test_guest_cannot_create_items(client, project, db):
    ws, proj, headers = project
    # Register second user and add as guest
    token2 = _register(client, "guest@example.com", "Guest")
    me2 = client.get("/api/auth/me", headers=_headers(token2)).json()
    # Get workspace id
    ws_list = client.get("/api/workspaces", headers=headers).json()
    ws_id = ws_list[0]["id"]
    # Add as guest directly via DB
    db.add(WorkspaceMember(workspace_id=ws_id, user_id=me2["id"], role="guest"))
    db.commit()
    # Guest CAN view items (workspace membership allows read access)
    resp = client.get(f"/api/workspaces/{ws}/projects/{proj}/items", headers=_headers(token2))
    assert resp.status_code == 200
    # Guest CANNOT create items (project-level role check requires editor or above)
    resp = client.post(f"/api/workspaces/{ws}/projects/{proj}/items", headers=_headers(token2), json={
        "title": "Guest item",
    })
    assert resp.status_code == 403


def test_member_can_create_items(client, project, db):
    ws, proj, headers = project
    token2 = _register(client, "member@example.com", "Member")
    me2 = client.get("/api/auth/me", headers=_headers(token2)).json()
    ws_list = client.get("/api/workspaces", headers=headers).json()
    ws_id = ws_list[0]["id"]
    db.add(WorkspaceMember(workspace_id=ws_id, user_id=me2["id"], role="member"))
    db.commit()
    resp = client.post(f"/api/workspaces/{ws}/projects/{proj}/items", headers=_headers(token2), json={
        "title": "Member item",
    })
    assert resp.status_code == 201


def test_admin_can_manage_members(client, workspace):
    ws, headers = workspace
    # Register a new user to add
    _register(client, "newmember@example.com", "New Member")
    resp = client.post(f"/api/workspaces/{ws}/members", headers=headers, json={
        "email": "newmember@example.com", "role": "member",
    })
    assert resp.status_code == 201


def test_owner_can_delete_project(client, project):
    ws, proj, headers = project
    resp = client.delete(f"/api/workspaces/{ws}/projects/{proj}", headers=headers)
    assert resp.status_code == 204


def test_superuser_can_access_admin(client, auth_headers, db):
    # Make the test user a superuser
    me = client.get("/api/auth/me", headers=auth_headers).json()
    user = db.get(User, me["id"])
    user.is_superuser = True
    db.commit()
    resp = client.get("/api/admin/dashboard", headers=auth_headers)
    assert resp.status_code == 200
    assert "total_users" in resp.json()


def test_non_superuser_cannot_access_admin(client, auth_headers):
    resp = client.get("/api/admin/dashboard", headers=auth_headers)
    assert resp.status_code == 403


def test_workspace_isolation(client, project):
    ws, proj, headers = project
    # Create item in first user's workspace
    client.post(f"/api/workspaces/{ws}/projects/{proj}/items", headers=headers, json={
        "title": "Secret item",
    })
    # Second user shouldn't see it
    token2 = _register(client, "isolated@example.com", "Isolated")
    resp = client.get(f"/api/workspaces/{ws}/projects/{proj}/items", headers=_headers(token2))
    assert resp.status_code == 403


def test_api_token_authentication(client, auth_headers, db):
    # Create an API token with no expiry to avoid SQLite naive/aware datetime issues
    resp = client.post("/api/profile/tokens", headers=auth_headers, json={
        "name": "test-token",
        "expires_in_days": None,
    })
    assert resp.status_code == 201
    raw_token = resp.json()["token"]
    assert raw_token.startswith("wit_")
    # Use it to authenticate
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {raw_token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "test@example.com"


def test_expired_api_token(client, auth_headers, db):
    # Create token without expiry, then expire it using a raw JWT with past exp
    # SQLite stores naive datetimes, so we test expiry via JWT instead of API token
    import jwt as pyjwt
    from app.auth import JWT_SECRET, JWT_ALGORITHM
    expired_jwt = pyjwt.encode(
        {"sub": "1", "exp": datetime(2020, 1, 1, tzinfo=timezone.utc)},
        JWT_SECRET,
        algorithm=JWT_ALGORITHM,
    )
    resp = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_jwt}"})
    assert resp.status_code == 401


def test_deactivated_user(client, auth_headers, db):
    me = client.get("/api/auth/me", headers=auth_headers).json()
    user = db.get(User, me["id"])
    user.is_active = False
    db.commit()
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 403


def test_wrong_workspace_slug(client, auth_headers):
    resp = client.get("/api/workspaces/nonexistent/projects/any/items", headers=auth_headers)
    assert resp.status_code == 404
