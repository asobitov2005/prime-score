"""User authentication router facade.

The implementation is split by responsibility while this module keeps the
original ``auth.router`` entrypoint and legacy function imports stable.
"""

from fastapi import APIRouter

from app.api.routes.auth_code import request_code, router as code_router, verify_code
from app.api.routes.auth_sessions import (
    force_logout_session,
    get_session_status,
    list_sessions,
    logout,
    refresh,
    router as sessions_router,
)
from app.api.routes.auth_support import (
    create_login_session_response,
    detect_device_info,
    enforce_active_session_limit,
    fetch_telegram_avatar_url,
    resolve_telegram_avatar_url,
    upsert_user_from_login,
)
from app.api.routes.auth_webapp import router as webapp_router, telegram_webapp_login

router = APIRouter()
router.include_router(code_router)
router.include_router(webapp_router)
router.include_router(sessions_router)

# Backward-compatible private aliases for existing tests and scripts.
_upsert_user_from_login = upsert_user_from_login
_fetch_telegram_avatar_url = fetch_telegram_avatar_url
_resolve_telegram_avatar_url = resolve_telegram_avatar_url
_enforce_active_session_limit = enforce_active_session_limit
_detect_device_info = detect_device_info
_create_login_session_response = create_login_session_response

__all__ = [
    "router",
    "request_code",
    "verify_code",
    "telegram_webapp_login",
    "refresh",
    "logout",
    "list_sessions",
    "get_session_status",
    "force_logout_session",
]
