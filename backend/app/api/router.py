from fastapi import APIRouter

from app.api.routes import admin, admin_ai, attempts, auth, leaderboard, me, plans, reviews, storage, tests


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(me.router, prefix="/me", tags=["me"])
api_router.include_router(plans.router, prefix="/plans", tags=["plans"])
api_router.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
api_router.include_router(tests.router, prefix="/tests", tags=["tests"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(storage.router, prefix="/storage", tags=["storage"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(admin_ai.router, prefix="/admin", tags=["admin-ai"])
