import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.services.admin_ai_agent import resume_pending_admin_ai_jobs


logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.project_name,
        version="0.1.0",
        docs_url="/docs",
        openapi_url="/openapi.json",
    )

    default_origins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3100",
        "http://localhost:3101",
        "http://localhost:3200",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://127.0.0.1:3100",
        "http://127.0.0.1:3101",
        "http://127.0.0.1:3200",
    ]
    extra_origins = [o for o in settings.cors_origins if o and o != "*"]
    allow_all = "*" in settings.cors_origins
    allowed_origins = ["*"] if allow_all else list({*default_origins, *extra_origins})

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=not allow_all,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/api/health", tags=["health"])
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/health", tags=["health"])
    async def root_healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.on_event("startup")
    async def startup_admin_ai_jobs() -> None:
        try:
            await resume_pending_admin_ai_jobs()
        except Exception:
            logger.exception("Failed to reconcile pending admin AI jobs")

    app.include_router(api_router, prefix="/api")
    return app


app = create_app()
