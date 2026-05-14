from fastapi import APIRouter

from app.api.routes import (
    admin,
    admin_ai,
    admin_speaking,
    admin_writing_config,
    admin_writing,
    attempts,
    auth,
    leaderboard,
    me,
    plans,
    reviews,
    speaking,
    storage,
    tests,
    writing,
)


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(me.router, prefix="/me", tags=["me"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(tests.router, prefix="/tests", tags=["tests"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
api_router.include_router(speaking.router, prefix="/speaking", tags=["speaking"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_ai.router, prefix="/admin", tags=["admin-ai"])
api_router.include_router(admin_speaking.router, prefix="/admin/speaking", tags=["admin-speaking"])
api_router.include_router(writing.router, prefix="/writing", tags=["writing"])
api_router.include_router(admin_writing.router, prefix="/admin/writing", tags=["admin-writing"])
api_router.include_router(admin_writing_config.router, prefix="/admin", tags=["admin-writing-config"])
