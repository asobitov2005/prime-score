from uuid import uuid4

from fastapi import APIRouter

from app.schemas.admin import AdminDashboard, AdminTestSummary


router = APIRouter()


@router.get("/dashboard", response_model=AdminDashboard)
async def get_admin_dashboard() -> AdminDashboard:
    return AdminDashboard(
        total_users=1250,
        active_premium_users=148,
        total_tests=21,
        draft_tests=4,
        paused_payments=True,
    )


@router.get("/tests", response_model=list[AdminTestSummary])
async def list_admin_tests() -> list[AdminTestSummary]:
    return [
        AdminTestSummary(
            id=uuid4(),
            title="Cambridge 18 Test 1",
            test_type="reading",
            access_type="public",
            status="published",
            version=1,
        ),
        AdminTestSummary(
            id=uuid4(),
            title="Listening Practice 4",
            test_type="listening",
            access_type="premium",
            status="draft",
            version=3,
        ),
    ]

