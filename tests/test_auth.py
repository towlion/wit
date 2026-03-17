def test_register_returns_token(client):
    resp = client.post("/api/auth/register", json={
        "email": "new@example.com",
        "display_name": "New User",
        "password": "password123",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_duplicate_email(client):
    payload = {"email": "dup@example.com", "display_name": "Dup", "password": "password123"}
    client.post("/api/auth/register", json=payload)
    resp = client.post("/api/auth/register", json=payload)
    assert resp.status_code == 409


def test_login_valid(client):
    client.post("/api/auth/register", json={
        "email": "login@example.com", "display_name": "Login", "password": "password123",
    })
    resp = client.post("/api/auth/login", json={
        "email": "login@example.com", "password": "password123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()


def test_login_wrong_password(client):
    client.post("/api/auth/register", json={
        "email": "wrong@example.com", "display_name": "Wrong", "password": "password123",
    })
    resp = client.post("/api/auth/login", json={
        "email": "wrong@example.com", "password": "wrongpassword",
    })
    assert resp.status_code == 401


def test_login_nonexistent_email(client):
    resp = client.post("/api/auth/login", json={
        "email": "nobody@example.com", "password": "password123",
    })
    assert resp.status_code == 401


def test_me_valid_token(client, auth_headers):
    resp = client.get("/api/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["email"] == "test@example.com"
    assert data["display_name"] == "Test User"


def test_me_no_token(client):
    resp = client.get("/api/auth/me")
    assert resp.status_code in (401, 403)  # HTTPBearer may return either


def test_me_invalid_token(client):
    resp = client.get("/api/auth/me", headers={"Authorization": "Bearer invalidtoken"})
    assert resp.status_code == 401


def test_profile_update_display_name(client, auth_headers):
    resp = client.patch("/api/profile", headers=auth_headers, json={
        "display_name": "Updated Name",
    })
    assert resp.status_code == 200
    assert resp.json()["display_name"] == "Updated Name"


def test_profile_update_theme(client, auth_headers):
    resp = client.patch("/api/profile", headers=auth_headers, json={
        "theme": "dark",
    })
    assert resp.status_code == 200
    assert resp.json()["theme"] == "dark"
