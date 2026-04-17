from fastapi import APIRouter

from app.api.routes import admin, attempts, auth, leaderboard, me, tests


api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(me.router, prefix="/me", tags=["me"])
api_router.include_router(tests.router, prefix="/tests", tags=["tests"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["attempts"])
api_router.include_router(leaderboard.router, prefix="/leaderboard", tags=["leaderboard"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
