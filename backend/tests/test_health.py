import pytest


@pytest.mark.asyncio
async def test_health_returns_200(client):
    response = await client.get("/health")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_health_body_has_status_and_redis(client):
    response = await client.get("/health")
    body = response.json()
    assert body["status"] == "healthy"
    assert "redis" in body
    assert isinstance(body["redis"], str)
    assert body["redis"]  # "ok" or "error: ..."

