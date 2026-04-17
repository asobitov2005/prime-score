from httpx import ASGITransport, AsyncClient

from app.main import app


async def test_healthcheck() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


async def test_list_tests() -> None:
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/tests")

    assert response.status_code == 200
    assert len(response.json()) == 2
