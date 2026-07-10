from fastapi.routing import APIRoute

from app.api.routes import admin, admin_test_routes


EXPECTED_ROUTE_SIGNATURES = {
    ("/auth/forgot-password", "POST"),
    ("/auth/reset-password/{token}", "GET"),
    ("/auth/reset-password", "POST"),
    ("/auth/login", "POST"),
    ("/auth/verify-otp", "POST"),
    ("/auth/refresh", "POST"),
    ("/auth/me", "GET"),
    ("/dashboard", "GET"),
    ("/analytics", "GET"),
    ("/tests", "GET"),
    ("/tests", "POST"),
    ("/tests/bulk-status", "PATCH"),
    ("/tests/bulk-publish", "PATCH"),
    ("/tests/draft", "POST"),
    ("/tests/{test_id}", "GET"),
    ("/tests/{test_id}/draft", "GET"),
    ("/tests/{test_id}", "PUT"),
    ("/tests/{test_id}/draft", "PUT"),
    ("/tests/{test_id}/quick-fix", "PUT"),
    ("/tests/{test_id}", "DELETE"),
    ("/tests/{test_id}/publish", "POST"),
    ("/tests/{test_id}/archive", "POST"),
    ("/tests/{test_id}/duplicate", "POST"),
    ("/sections", "POST"),
    ("/passages", "POST"),
    ("/paragraphs", "POST"),
    ("/question-groups", "POST"),
    ("/questions", "POST"),
    ("/answers", "POST"),
    ("/audio/upload-url", "POST"),
    ("/audio/upload", "POST"),
    ("/audio/transcribe", "POST"),
    ("/audio/transcribe/jobs", "POST"),
    ("/audio/transcribe/jobs/{job_id}", "GET"),
    ("/audio/transcribe/jobs/{job_id}/cancel", "POST"),
    ("/images/upload-url", "POST"),
    ("/images/upload", "POST"),
    ("/telegram-users", "GET"),
    ("/users", "GET"),
    ("/reviews", "GET"),
    ("/reviews", "POST"),
    ("/reviews/{review_id}/visibility", "PATCH"),
    ("/users/{user_id}", "GET"),
    ("/users/{user_id}/activity", "GET"),
    ("/users/bulk-premium", "POST"),
    ("/users/{user_id}/revoke-premium", "POST"),
    ("/users/{user_id}/toggle-leaderboard", "PATCH"),
    ("/users", "POST"),
    ("/users/{user_id}", "DELETE"),
    ("/check-premiums", "POST"),
    ("/settings", "GET"),
    ("/auth/security", "PATCH"),
    ("/plans", "GET"),
    ("/gift-code-plans", "GET"),
    ("/plans", "POST"),
    ("/plans/{plan_id}", "PATCH"),
    ("/gift-codes", "GET"),
    ("/gift-codes", "POST"),
    ("/gift-codes/{gift_code_id}", "PATCH"),
    ("/payments", "GET"),
    ("/payments/{payment_id}", "PATCH"),
    ("/payment-cards", "GET"),
    ("/payment-cards", "POST"),
    ("/payment-cards/{card_id}", "PATCH"),
    ("/payment-settings", "GET"),
    ("/payment-settings", "PATCH"),
    ("/promo-codes", "GET"),
    ("/promo-codes", "POST"),
    ("/promo-codes/{promo_code_id}", "PATCH"),
    ("/admins", "GET"),
    ("/admins", "POST"),
    ("/audit-log", "GET"),
    ("/broadcast-notification", "POST"),
    ("/export-users-csv", "GET"),
    ("/clear-sessions", "POST"),
    ("/draft-tests", "DELETE"),
    ("/sync-leaderboard", "POST"),
    ("/settings", "PATCH"),
}


def route_signatures() -> set[tuple[str, str]]:
    signatures: set[tuple[str, str]] = set()
    for route in admin.router.routes:
        if not isinstance(route, APIRoute):
            continue
        for method in route.methods or set():
            signatures.add((route.path, method))
    return signatures


def test_admin_facade_keeps_all_route_contracts() -> None:
    assert EXPECTED_ROUTE_SIGNATURES <= route_signatures()


def test_admin_facade_forwards_monkeypatches(monkeypatch) -> None:
    original = admin_test_routes.list_tests_from_db

    async def replacement(*args, **kwargs):
        return []

    monkeypatch.setattr(admin, "list_tests_from_db", replacement)
    assert admin_test_routes.list_tests_from_db is replacement

    monkeypatch.setattr(admin, "list_tests_from_db", original)
    assert admin_test_routes.list_tests_from_db is original
