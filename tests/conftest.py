import pytest
import sqlalchemy
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.database import get_db
from app.main import app
from app.models import Base

# Disable Enum CHECK constraints for SQLite compatibility
for table in Base.metadata.tables.values():
    for column in table.columns:
        if isinstance(column.type, sqlalchemy.Enum):
            column.type.create_constraint = False

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(bind=engine)


@pytest.fixture(autouse=True)
def db():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db):
    def override_get_db():
        yield db

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client):
    resp = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "display_name": "Test User",
        "password": "testpassword123",
    })
    assert resp.status_code == 201
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def workspace(client, auth_headers):
    resp = client.get("/api/workspaces", headers=auth_headers)
    assert resp.status_code == 200
    ws_slug = resp.json()[0]["slug"]
    return ws_slug, auth_headers


@pytest.fixture
def project(client, workspace):
    ws_slug, headers = workspace
    resp = client.post(f"/api/workspaces/{ws_slug}/projects", headers=headers, json={
        "name": "Test Project",
        "slug": "test-project",
        "template": "software",
    })
    assert resp.status_code == 201
    return ws_slug, "test-project", headers
