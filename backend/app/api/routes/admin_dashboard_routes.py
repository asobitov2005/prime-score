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

@router.get("/dashboard", response_model=AdminDashboardRead)
async def dashboard(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    params: AdminFilterParams = Depends(),
) -> AdminDashboardRead:
    _ = current_admin
    try:
        now = datetime.now(UTC)
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        active_7d_start = now - timedelta(days=7)

        users_total = await session.scalar(apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None)), User, params)) or 0
        users_new_today = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.created_at >= today_start), User, params)
        ) or 0
        active_users_7d = await session.scalar(
            select(func.count()).select_from(User).where(
                User.deleted_at.is_(None),
                User.last_active_at.isnot(None),
                User.last_active_at >= active_7d_start,
            )
        ) or 0
        premium_users = await session.scalar(
            select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.is_premium == True)
        ) or 0
        tests_total = await session.scalar(apply_admin_filters(select(func.count()).select_from(Test), Test, params)) or 0
        tests_published = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(Test), Test, params).where(Test.status == ModelTestStatus.PUBLISHED)
        ) or 0
        tests_draft = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(Test), Test, params).where(Test.status == ModelTestStatus.DRAFT)
        ) or 0
        tests_archived = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(Test), Test, params).where(Test.status == ModelTestStatus.ARCHIVED)
        ) or 0
        attempts_total = await session.scalar(apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params)) or 0
        attempts_completed = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params).where(
                Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES)
            )
        ) or 0
        attempts_today = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params).where(Attempt.created_at >= today_start)
        ) or 0
        avg_band_row = await session.scalar(
            select(func.avg(Attempt.band_score)).where(
                Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES),
                Attempt.band_score.isnot(None),
            )
        )
        payments_pending = await session.scalar(
            select(func.count()).select_from(Payment).where(Payment.status.in_(["pending", "matched", "review"]))
        ) or 0
        payments_completed = await session.scalar(
            select(func.count()).select_from(Payment).where(Payment.status == "completed")
        ) or 0
        revenue_total_raw = await session.scalar(
            select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == "completed")
        )
        recent_entries = list(
            (
                await session.scalars(
                    select(AuditLog)
                    .order_by(AuditLog.created_at.desc())
                    .limit(6)
                )
            ).all()
        )
        # ---- new analytics: revenue trend (30 days) ----
        thirty_days_ago = now - timedelta(days=30)
        rev_rows = (
            await session.execute(
                select(func.date(Payment.paid_at), func.coalesce(func.sum(Payment.amount), 0))
                .where(Payment.status == "completed", Payment.paid_at.isnot(None), Payment.paid_at >= thirty_days_ago)
                .group_by(func.date(Payment.paid_at))
            )
        ).all()
        rev_by_date = {str(d): float(v) for d, v in rev_rows}
        revenue_trend = [
            AdminTrendPointRead(
                date=(thirty_days_ago + timedelta(days=i)).strftime("%d %b"),
                value=rev_by_date.get((thirty_days_ago + timedelta(days=i)).date().isoformat(), 0),
            )
            for i in range(31)
        ]

        # ---- registration trend (30 days) ----
        reg_rows = (
            await session.execute(
                select(func.date(User.created_at), func.count(User.id))
                .where(User.deleted_at.is_(None), User.created_at >= thirty_days_ago)
                .group_by(func.date(User.created_at))
            )
        ).all()
        reg_by_date = {str(d): int(v) for d, v in reg_rows}
        registration_trend = [
            AdminTrendPointRead(
                date=(thirty_days_ago + timedelta(days=i)).strftime("%d %b"),
                value=reg_by_date.get((thirty_days_ago + timedelta(days=i)).date().isoformat(), 0),
            )
            for i in range(31)
        ]

        # ---- attempts by day (30 days) ----
        att_rows = (
            await session.execute(
                select(func.date(Attempt.created_at), func.count(Attempt.id))
                .where(Attempt.created_at >= thirty_days_ago)
                .group_by(func.date(Attempt.created_at))
            )
        ).all()
        att_by_date = {str(d): int(v) for d, v in att_rows}
        attempts_by_day = [
            AdminTrendPointRead(
                date=(thirty_days_ago + timedelta(days=i)).strftime("%d %b"),
                value=att_by_date.get((thirty_days_ago + timedelta(days=i)).date().isoformat(), 0),
            )
            for i in range(31)
        ]

        # ---- type split ----
        reading_count = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params).where(Attempt.test_type == "reading")
        ) or 0
        listening_count = await session.scalar(
            apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params).where(Attempt.test_type == "listening")
        ) or 0
        type_split = AdminTypeSplitRead(reading=int(reading_count), listening=int(listening_count))

        # ---- band distribution ----
        band_rows = (
            await session.execute(
                select(Attempt.band_score)
                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None))
            )
        ).scalars().all()
        band_buckets: dict[str, int] = {}
        for b_val in band_rows:
            rounded = round(float(b_val) * 2) / 2
            key = f"{rounded:.1f}"
            band_buckets[key] = band_buckets.get(key, 0) + 1
        band_distribution = [
            AdminBandDistributionPointRead(band=k, count=v)
            for k, v in sorted(band_buckets.items(), key=lambda x: float(x[0]))
        ]

        # ---- top active users ----
        top_user_rows = (
            await session.execute(
                select(
                    User.first_name,
                    User.last_name,
                    func.count(Attempt.id).label("att_count"),
                    func.max(Attempt.created_at).label("last_att"),
                )
                .join(Attempt, Attempt.user_id == User.id)
                .where(User.deleted_at.is_(None))
                .group_by(User.id, User.first_name, User.last_name)
                .order_by(desc("att_count"))
                .limit(10)
            )
        ).all()
        top_active_users = [
            AdminTopActiveUserRead(
                name=f"{fn or ''} {ln or ''}".strip() or "Unknown",
                attempt_count=int(ac),
                last_active=la.strftime("%d %b %Y") if la else None,
            )
            for fn, ln, ac, la in top_user_rows
        ]

        # ---- avg time per test ----
        reading_avg_time = await session.scalar(
            select(func.avg(Attempt.time_limit_seconds - func.coalesce(
                func.cast(Attempt.attempt_metadata["remaining_seconds"].as_string(), Integer), Attempt.time_limit_seconds
            ))).where(
                Attempt.test_type == "reading",
                Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES),
                Attempt.time_limit_seconds > 0,
            )
        )
        listening_avg_time = await session.scalar(
            select(func.avg(Attempt.time_limit_seconds - func.coalesce(
                func.cast(Attempt.attempt_metadata["remaining_seconds"].as_string(), Integer), Attempt.time_limit_seconds
            ))).where(
                Attempt.test_type == "listening",
                Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES),
                Attempt.time_limit_seconds > 0,
            )
        )
        avg_time_per_test = AdminAvgTimePerTestRead(
            reading_avg_min=round(float(reading_avg_time) / 60, 1) if reading_avg_time else None,
            listening_avg_min=round(float(listening_avg_time) / 60, 1) if listening_avg_time else None,
        )

        # ---- quick stats ----
        try:
            fastest_att = await session.scalar(
                select(func.min(Attempt.time_limit_seconds - func.coalesce(func.cast(Attempt.attempt_metadata["remaining_seconds"].as_string(), Integer), Attempt.time_limit_seconds)))
                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.time_limit_seconds > 0)
            )
            avg_acc = await session.scalar(
                select(func.avg(Attempt.raw_score / Attempt.max_score * 100.0))
                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.max_score > 0)
            )
            highest_band_achieved = await session.scalar(
                select(func.max(Attempt.band_score))
                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES))
            )

            quick_stats = AdminQuickStatsRead(
                fastest_completion_min=round(float(fastest_att) / 60, 1) if fastest_att and float(fastest_att) > 0 else None,
                average_accuracy=round(float(avg_acc), 1) if avg_acc else 0.0,
                highest_band_achieved=highest_band_achieved,
            )
        except Exception:
            import traceback
            traceback.print_exc()
            quick_stats = AdminQuickStatsRead()

        return AdminDashboardRead(
            users_total=int(users_total),
            users_new_today=int(users_new_today),
            active_users_7d=int(active_users_7d),
            premium_users=int(premium_users),
            tests_total=int(tests_total),
            tests_published=int(tests_published),
            tests_draft=int(tests_draft),
            tests_archived=int(tests_archived),
            attempts_total=int(attempts_total),
            attempts_completed=int(attempts_completed),
            attempts_today=int(attempts_today),
            payments_pending=int(payments_pending),
            payments_completed=int(payments_completed),
            revenue_total=float(revenue_total_raw or 0),
            average_band=float(avg_band_row) if avg_band_row is not None else None,
            completion_rate=round((int(attempts_completed) / int(attempts_total) * 100), 1) if attempts_total else 0,
            premium_rate=round((int(premium_users) / int(users_total) * 100), 1) if users_total else 0,
            recent_activity=[
                f"{entry.action} • {entry.entity_type}:{entry.entity_id}"
                for entry in recent_entries
            ],
            revenue_trend=revenue_trend,
            registration_trend=registration_trend,
            attempts_by_day=attempts_by_day,
            type_split=type_split,
            band_distribution=band_distribution,
            top_active_users=top_active_users,
            avg_time_per_test=avg_time_per_test,
            quick_stats=quick_stats,
        )
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        return AdminDashboardRead(
            users_total=0,
            users_new_today=0,
            active_users_7d=0,
            premium_users=0,
            tests_total=0,
            tests_published=0,
            tests_draft=0,
            tests_archived=0,
            attempts_total=0,
            attempts_completed=0,
            attempts_today=0,
            payments_pending=0,
            payments_completed=0,
            revenue_total=0,
            average_band=None,
            completion_rate=0,
            premium_rate=0,
            recent_activity=[],
        )
