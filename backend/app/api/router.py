from fastapi import APIRouter

from app.api.routes import (
    admin,
    admin_ai,
    admin_online_mocks,
    admin_xp,
    admin_speaking,
    admin_writing_config,
    admin_writing,
    attempts,
    auth,
    click,
    leaderboard,
    me,
    mock_schedules,
    online_mocks,
    plans,
    reviews,
    speaking,
    storage,
    tests,
    writing,
)


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(click.router, prefix="/payments/click", tags=["click-payments"])
api_router.include_router(me.router, prefix="/me", tags=["me"])
api_router.include_router(mock_schedules.router, prefix="/mock", tags=["mock-scheduling"])
api_router.include_router(online_mocks.router, prefix="/mock", tags=["online-mocks"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(tests.router, prefix="/tests", tags=["tests"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
api_router.include_router(speaking.router, prefix="/speaking", tags=["speaking"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_online_mocks.router, prefix="/admin", tags=["admin-mocks"])
api_router.include_router(admin_ai.router, prefix="/admin", tags=["admin-ai"])
api_router.include_router(admin_xp.router, prefix="/admin", tags=["admin-xp"])
api_router.include_router(admin_speaking.router, prefix="/admin/speaking", tags=["admin-speaking"])
api_router.include_router(writing.router, prefix="/writing", tags=["writing"])
api_router.include_router(admin_writing.router, prefix="/admin/writing", tags=["admin-writing"])
api_router.include_router(admin_writing_config.router, prefix="/admin", tags=["admin-writing-config"])
