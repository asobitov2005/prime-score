from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *

router = APIRouter()

@router.get("/analytics", response_model=AdminAnalyticsReportRead)
async def analytics(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    params: AdminFilterParams = Depends(),
) -> AdminAnalyticsReportRead:
    _ = current_admin
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = today_start - timedelta(days=6)
    month_start = today_start - timedelta(days=29)

    users_total = await session.scalar(apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None)), User, params)) or 0
    premium_users = await session.scalar(
        apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.is_premium == True), User, params)
    ) or 0
    dau = await session.scalar(
        apply_admin_filters(select(func.count(func.distinct(Attempt.user_id))).where(Attempt.created_at >= today_start), Attempt, params)
    ) or 0
    wau = await session.scalar(
        apply_admin_filters(select(func.count(func.distinct(Attempt.user_id))).where(Attempt.created_at >= week_start), Attempt, params)
    ) or 0
    mau = await session.scalar(
        apply_admin_filters(select(func.count(func.distinct(Attempt.user_id))).where(Attempt.created_at >= month_start), Attempt, params)
    ) or 0

    activity_rows = (
        await session.execute(
            apply_admin_filters(select(func.date(Attempt.created_at), func.count(Attempt.id))
            .where(Attempt.created_at >= week_start), Attempt, params)
            .group_by(func.date(Attempt.created_at))
        )
    ).all()
    activity_by_date = {str(day): int(count) for day, count in activity_rows}
    activity_points = [
        AdminAnalyticsPointRead(
            label=(week_start + timedelta(days=offset)).strftime("%a"),
            value=activity_by_date.get((week_start + timedelta(days=offset)).date().isoformat(), 0),
        )
        for offset in range(7)
    ]

    top_rows = (
        await session.execute(
            apply_admin_filters(select(Test.title, func.count(Attempt.id).label("attempt_count"))
            .join(Attempt, Attempt.test_id == Test.id), Attempt, params)
            .group_by(Test.id, Test.title)
            .order_by(desc("attempt_count"))
            .limit(5)
        )
    ).all()

    hardest_rows = (
        await session.execute(
            select(
                QuestionGroup.question_type,
                func.count(UserAnswer.id).label("answer_count"),
                func.sum(case((UserAnswer.is_correct.is_(False), 1), else_=0)).label("incorrect_count"),
            )
            .join(Question, Question.question_group_id == QuestionGroup.id)
            .join(UserAnswer, UserAnswer.question_id == Question.id)
            .where(UserAnswer.is_correct.isnot(None))
            .group_by(QuestionGroup.question_type)
            .order_by(desc("incorrect_count"))
            .limit(5)
        )
    ).all()

    # ---- new: DAU trend (30 days) ----
    dau_trend_rows = (
        await session.execute(
            apply_admin_filters(select(func.date(Attempt.created_at), func.count(func.distinct(Attempt.user_id)))
            .where(Attempt.created_at >= month_start), Attempt, params)
            .group_by(func.date(Attempt.created_at))
        )
    ).all()
    dau_by_date = {str(d): int(v) for d, v in dau_trend_rows}
    dau_trend = [
        AdminTrendPointRead(
            date=(month_start + timedelta(days=i)).strftime("%d %b"),
            value=dau_by_date.get((month_start + timedelta(days=i)).date().isoformat(), 0),
        )
        for i in range(30)
    ]

    # ---- completion funnel ----
    funnel_started = await session.scalar(apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params)) or 0
    funnel_completed = await session.scalar(
        apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params).where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES))
    ) or 0
    completion_funnel = AdminCompletionFunnelRead(
        started=int(funnel_started),
        completed=int(funnel_completed),
        rate=round((int(funnel_completed) / int(funnel_started) * 100), 1) if funnel_started else 0,
    )

    # ---- avg score by test ----
    avg_by_test_rows = (
        await session.execute(
            apply_admin_filters(select(
                Test.title,
                func.avg(Attempt.band_score).label("avg_band"),
                func.count(Attempt.id).label("att_count"),
            )
            .join(Attempt, Attempt.test_id == Test.id)
            .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None)), Attempt, params)
            .group_by(Test.id, Test.title)
            .order_by(desc("att_count"))
            .limit(10)
        )
    ).all()
    avg_score_by_test = [
        AdminAvgScoreByTestRead(test_title=str(t), avg_band=round(float(ab), 1), attempt_count=int(ac))
        for t, ab, ac in avg_by_test_rows
    ]

    # ---- hourly distribution ----
    hour_rows = (
        await session.execute(
            apply_admin_filters(select(
                func.extract("hour", Attempt.created_at).label("hr"),
                func.count(Attempt.id),
            ), Attempt, params)
            .group_by("hr")
            .order_by("hr")
        )
    ).all()
    hour_map = {int(h): int(c) for h, c in hour_rows}
    hourly_distribution = [
        AdminAnalyticsPointRead(label=f"{h:02d}:00", value=hour_map.get(h, 0))
        for h in range(24)
    ]

    # ---- user segmentation ----
    free_count = int(users_total) - int(premium_users)
    free_attempts = await session.scalar(
        apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params)
        .join(User, User.id == Attempt.user_id)
        .where(User.is_premium == False, User.deleted_at.is_(None))
    ) or 0
    premium_attempts = await session.scalar(
        apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params)
        .join(User, User.id == Attempt.user_id)
        .where(User.is_premium == True, User.deleted_at.is_(None))
    ) or 0
    user_segmentation = AdminUserSegmentationRead(
        free=AdminUserSegmentRead(
            count=free_count,
            avg_attempts=round(int(free_attempts) / max(1, free_count), 1),
        ),
        premium=AdminUserSegmentRead(
            count=int(premium_users),
            avg_attempts=round(int(premium_attempts) / max(1, int(premium_users)), 1),
        ),
    )

    return AdminAnalyticsReportRead(
        dau=int(dau),
        wau=int(wau),
        mau=int(mau),
        conversion_rate=_format_percent(int(premium_users), int(users_total)),
        churn_rate="0%",
        activity_points=activity_points,
        top_tests=[AdminAnalyticsTopTestRead(title=str(title), count=int(count)) for title, count in top_rows],
        hardest_question_types=[
            AdminAnalyticsQuestionTypeRead(
                type=getattr(question_type, "value", str(question_type)),
                error_rate=_format_percent(int(incorrect_count or 0), int(answer_count or 0)),
            )
            for question_type, answer_count, incorrect_count in hardest_rows
        ],
        dau_trend=dau_trend,
        completion_funnel=completion_funnel,
        avg_score_by_test=avg_score_by_test,
        hourly_distribution=hourly_distribution,
        user_segmentation=user_segmentation,
    )
