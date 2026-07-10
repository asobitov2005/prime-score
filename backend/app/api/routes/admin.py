from __future__ import annotations

import sys
import types

from fastapi import APIRouter

from app.api.routes import admin_contracts as _admin_contracts
from app.api.routes import admin_common as _admin_common
from app.api.routes import admin_commerce_support as _admin_commerce_support
from app.api.routes import admin_auth_support as _admin_auth_support
from app.api.routes import admin_user_support as _admin_user_support
from app.api.routes import admin_password_reset_routes as _admin_password_reset_routes
from app.api.routes import admin_auth_session_routes as _admin_auth_session_routes
from app.api.routes import admin_dashboard_routes as _admin_dashboard_routes
from app.api.routes import admin_analytics_routes as _admin_analytics_routes
from app.api.routes import admin_test_routes as _admin_test_routes
from app.api.routes import admin_content_routes as _admin_content_routes
from app.api.routes import admin_media_routes as _admin_media_routes
from app.api.routes import admin_directory_review_routes as _admin_directory_review_routes
from app.api.routes import admin_user_activity_routes as _admin_user_activity_routes
from app.api.routes import admin_user_mutation_routes as _admin_user_mutation_routes
from app.api.routes import admin_settings_routes as _admin_settings_routes
from app.api.routes import admin_plan_routes as _admin_plan_routes
from app.api.routes import admin_gift_code_routes as _admin_gift_code_routes
from app.api.routes import admin_payment_routes as _admin_payment_routes
from app.api.routes import admin_promo_routes as _admin_promo_routes
from app.api.routes import admin_system_routes as _admin_system_routes

_ROUTE_MODULES = (
    _admin_password_reset_routes,
    _admin_auth_session_routes,
    _admin_dashboard_routes,
    _admin_analytics_routes,
    _admin_test_routes,
    _admin_content_routes,
    _admin_media_routes,
    _admin_directory_review_routes,
    _admin_user_activity_routes,
    _admin_user_mutation_routes,
    _admin_settings_routes,
    _admin_plan_routes,
    _admin_gift_code_routes,
    _admin_payment_routes,
    _admin_promo_routes,
    _admin_system_routes,
)
_COMPAT_MODULES = (
    _admin_contracts,
    _admin_common,
    _admin_commerce_support,
    _admin_auth_support,
    _admin_user_support,
    _admin_password_reset_routes,
    _admin_auth_session_routes,
    _admin_dashboard_routes,
    _admin_analytics_routes,
    _admin_test_routes,
    _admin_content_routes,
    _admin_media_routes,
    _admin_directory_review_routes,
    _admin_user_activity_routes,
    _admin_user_mutation_routes,
    _admin_settings_routes,
    _admin_plan_routes,
    _admin_gift_code_routes,
    _admin_payment_routes,
    _admin_promo_routes,
    _admin_system_routes,
)

router = APIRouter()
for _module in _ROUTE_MODULES:
    router.routes.extend(_module.router.routes)

for _module in _COMPAT_MODULES:
    for _name, _value in vars(_module).items():
        if _name == "router" or _name.startswith("__"):
            continue
        globals().setdefault(_name, _value)


class _AdminFacadeModule(types.ModuleType):
    def __setattr__(self, name: str, value: object) -> None:
        super().__setattr__(name, value)
        if name.startswith("__") or name == "router":
            return
        for module in _COMPAT_MODULES:
            if hasattr(module, name):
                setattr(module, name, value)


sys.modules[__name__].__class__ = _AdminFacadeModule
__all__ = ["router"]
