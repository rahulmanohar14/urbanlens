import pytest

API_V1_PREFIXES = [
    "/api/v1/auth",
    "/api/v1/incidents",
    "/api/v1/crimes",
    "/api/v1/neighborhoods",
    "/api/v1/analytics",
    "/api/v1/predictions",
]


@pytest.mark.asyncio
async def test_openapi_returns_200(client):
    response = await client.get("/openapi.json")
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_openapi_contains_api_v1_paths(client):
    response = await client.get("/openapi.json")
    paths = response.json()["paths"]
    path_keys = " ".join(paths.keys())
    for prefix in API_V1_PREFIXES:
        assert any(p.startswith(prefix) for p in paths), f"missing routes under {prefix}"


@pytest.mark.asyncio
async def test_response_includes_timing_header(client):
    response = await client.get("/health")
    assert "X-Response-Time" in response.headers
    assert response.headers["X-Response-Time"].endswith("s")


@pytest.mark.asyncio
async def test_unknown_route_returns_404(client):
    response = await client.get("/this-route-does-not-exist")
    assert response.status_code == 404
