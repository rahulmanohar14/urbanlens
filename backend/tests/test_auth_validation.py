import pytest
from pydantic import ValidationError

from app.schemas.user import UserCreate


@pytest.mark.asyncio
async def test_register_missing_query_params_returns_422(client):
    response = await client.post("/api/v1/auth/register")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_query_params_returns_422(client):
    response = await client.post("/api/v1/auth/login")
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_missing_password_returns_422(client):
    response = await client.post("/api/v1/auth/register", params={"email": "user@example.com"})
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_missing_email_returns_422(client):
    response = await client.post("/api/v1/auth/login", params={"password": "secret123"})
    assert response.status_code == 422


def test_user_create_schema_rejects_short_password():
    with pytest.raises(ValidationError) as exc_info:
        UserCreate(email="user@example.com", password="abc")
    errors = exc_info.value.errors()
    assert any(e["loc"] == ("password",) for e in errors)

