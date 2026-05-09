import re
from pathlib import Path

file_path = Path("backend/app/api/routes/admin.py")
content = file_path.read_text()

# 1. Update /analytics endpoint signature
old_sig = """async def analytics_report(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminAnalyticsReportRead:"""
new_sig = """async def analytics_report(
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    params: AdminFilterParams = Depends(),
) -> AdminAnalyticsReportRead:"""
content = content.replace(old_sig, new_sig)

replacements = [
    (
        "select(Attempt.test_type, func.count(Attempt.id))\\n            .group_by(Attempt.test_type)",
        "apply_admin_filters(select(Attempt.test_type, func.count(Attempt.id)), Attempt, params)\\n            .group_by(Attempt.test_type)"
    ),
    (
        "select(Test.title, func.count(Attempt.id).label(\"count\"))\\n            .select_from(Attempt)\\n            .join(Test, Attempt.test_id == Test.id)\\n            .group_by(Test.title)\\n            .order_by(desc(\"count\"))\\n            .limit(5)",
        "apply_admin_filters(select(Test.title, func.count(Attempt.id).label(\"count\"))\\n            .select_from(Attempt)\\n            .join(Test, Attempt.test_id == Test.id), Attempt, params)\\n            .group_by(Test.title)\\n            .order_by(desc(\"count\"))\\n            .limit(5)"
    ),
    (
        "select(Test.title, func.avg(Attempt.band_score).label(\"avg_score\"))\\n            .select_from(Attempt)\\n            .join(Test, Attempt.test_id == Test.id)\\n            .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None))\\n            .group_by(Test.title)\\n            .order_by(desc(\"avg_score\"))\\n            .limit(10)",
        "apply_admin_filters(select(Test.title, func.avg(Attempt.band_score).label(\"avg_score\"))\\n            .select_from(Attempt)\\n            .join(Test, Attempt.test_id == Test.id)\\n            .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None)), Attempt, params)\\n            .group_by(Test.title)\\n            .order_by(desc(\"avg_score\"))\\n            .limit(10)"
    ),
    (
        "select(func.extract('isodow', Attempt.created_at).label('dow'), func.count(Attempt.id))\\n            .where(Attempt.created_at >= thirty_days_ago)\\n            .group_by('dow')",
        "apply_admin_filters(select(func.extract('isodow', Attempt.created_at).label('dow'), func.count(Attempt.id))\\n            .where(Attempt.created_at >= thirty_days_ago), Attempt, params)\\n            .group_by('dow')"
    ),
    (
        "select(func.extract('hour', Attempt.created_at).label('hr'), func.count(Attempt.id))\\n            .where(Attempt.created_at >= thirty_days_ago)\\n            .group_by('hr')",
        "apply_admin_filters(select(func.extract('hour', Attempt.created_at).label('hr'), func.count(Attempt.id))\\n            .where(Attempt.created_at >= thirty_days_ago), Attempt, params)\\n            .group_by('hr')"
    ),
    (
        "select(Payment.method, func.sum(Payment.amount))\\n            .where(Payment.status == PaymentStatus.COMPLETED)\\n            .group_by(Payment.method)",
        "apply_admin_filters(select(Payment.method, func.sum(Payment.amount))\\n            .where(Payment.status == PaymentStatus.COMPLETED), Payment, params)\\n            .group_by(Payment.method)"
    ),
    (
        "select(Attempt.status, func.count(Attempt.id))\\n            .group_by(Attempt.status)",
        "apply_admin_filters(select(Attempt.status, func.count(Attempt.id)), Attempt, params)\\n            .group_by(Attempt.status)"
    ),
    (
        "select(\\n                User.id,\\n                User.first_name,\\n                User.last_name,\\n                User.last_active_at,\\n                func.count(Attempt.id).label(\"att_count\")\\n            )\\n            .select_from(User)\\n            .join(Attempt, Attempt.user_id == User.id)\\n            .group_by(User.id)\\n            .order_by(desc(\"att_count\"))\\n            .limit(10)",
        "apply_admin_filters(select(\\n                User.id,\\n                User.first_name,\\n                User.last_name,\\n                User.last_active_at,\\n                func.count(Attempt.id).label(\"att_count\")\\n            )\\n            .select_from(User)\\n            .join(Attempt, Attempt.user_id == User.id), Attempt, params)\\n            .group_by(User.id)\\n            .order_by(desc(\"att_count\"))\\n            .limit(10)"
    )
]

for old, new in replacements:
    content = content.replace(old, new)
    
file_path.write_text(content)
print("Analytics replacements applied.")
