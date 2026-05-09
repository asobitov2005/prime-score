import re
from pathlib import Path

file_path = Path("backend/app/api/routes/admin.py")
content = file_path.read_text()

def wrap_queries(block_text):
    # This is a naive but effective way to wrap select() calls.
    # For User:
    block_text = re.sub(r'select\((.*?)\)\.select_from\(User\)', r'apply_admin_filters(select(\1).select_from(User), User, params)', block_text)
    
    # For Attempt (various forms)
    # select(func.count()).select_from(Attempt)
    block_text = re.sub(r'select\((.*?)\)\.select_from\(Attempt\)', r'apply_admin_filters(select(\1).select_from(Attempt), Attempt, params)', block_text)
    
    # select(func.min(...)).where(Attempt...) -> we need to wrap the whole select
    # It's better to explicitly wrap assignments:
    # users_total = await session.scalar(select(...))
    # -> users_total = await session.scalar(apply_admin_filters(select(...), User, params))
    return block_text

# Actually, I will explicitly replace the known assignments in dashboard to be safe.
replacements = [
    (
        "select(func.count()).select_from(User).where(User.deleted_at.is_(None))",
        "apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None)), User, params)"
    ),
    (
        "select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.created_at >= today_start)",
        "apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.created_at >= today_start), User, params)"
    ),
    (
        "select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.last_active_at >= active_7d_start)",
        "apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.last_active_at >= active_7d_start), User, params, date_column='last_active_at')"
    ),
    (
        "select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.is_premium.is_(True))",
        "apply_admin_filters(select(func.count()).select_from(User).where(User.deleted_at.is_(None), User.is_premium.is_(True)), User, params)"
    ),
    (
        "select(func.count()).select_from(Test)",
        "apply_admin_filters(select(func.count()).select_from(Test), Test, params)"
    ),
    (
        "select(func.count()).select_from(Test).where(Test.status == TestStatus.PUBLISHED)",
        "apply_admin_filters(select(func.count()).select_from(Test).where(Test.status == TestStatus.PUBLISHED), Test, params)"
    ),
    (
        "select(func.count()).select_from(Test).where(Test.status == TestStatus.DRAFT)",
        "apply_admin_filters(select(func.count()).select_from(Test).where(Test.status == TestStatus.DRAFT), Test, params)"
    ),
    (
        "select(func.count()).select_from(Test).where(Test.status == TestStatus.ARCHIVED)",
        "apply_admin_filters(select(func.count()).select_from(Test).where(Test.status == TestStatus.ARCHIVED), Test, params)"
    ),
    (
        "select(func.count()).select_from(Attempt)",
        "apply_admin_filters(select(func.count()).select_from(Attempt), Attempt, params)"
    ),
    (
        "select(func.count()).select_from(Attempt).where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES))",
        "apply_admin_filters(select(func.count()).select_from(Attempt).where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES)), Attempt, params)"
    ),
    (
        "select(func.count()).select_from(Attempt).where(Attempt.created_at >= today_start)",
        "apply_admin_filters(select(func.count()).select_from(Attempt).where(Attempt.created_at >= today_start), Attempt, params)"
    ),
    (
        "select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.PENDING)",
        "apply_admin_filters(select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.PENDING), Payment, params)"
    ),
    (
        "select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.COMPLETED)",
        "apply_admin_filters(select(func.count()).select_from(Payment).where(Payment.status == PaymentStatus.COMPLETED), Payment, params)"
    ),
    (
        "select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.COMPLETED)",
        "apply_admin_filters(select(func.sum(Payment.amount)).where(Payment.status == PaymentStatus.COMPLETED), Payment, params)"
    ),
    (
        "select(func.avg(Attempt.band_score)).where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None))",
        "apply_admin_filters(select(func.avg(Attempt.band_score)).where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None)), Attempt, params)"
    ),
    (
        "select(func.date(Payment.created_at), func.sum(Payment.amount))\\n                .where(Payment.status == PaymentStatus.COMPLETED, Payment.created_at >= thirty_days_ago)\\n                .group_by(func.date(Payment.created_at))",
        "apply_admin_filters(select(func.date(Payment.created_at), func.sum(Payment.amount))\\n                .where(Payment.status == PaymentStatus.COMPLETED, Payment.created_at >= thirty_days_ago), Payment, params)\\n                .group_by(func.date(Payment.created_at))"
    ),
    (
        "select(func.date(User.created_at), func.count(User.id))\\n                .where(User.deleted_at.is_(None), User.created_at >= thirty_days_ago)\\n                .group_by(func.date(User.created_at))",
        "apply_admin_filters(select(func.date(User.created_at), func.count(User.id))\\n                .where(User.deleted_at.is_(None), User.created_at >= thirty_days_ago), User, params)\\n                .group_by(func.date(User.created_at))"
    ),
    (
        "select(func.date(Attempt.created_at), func.count(Attempt.id))\\n                .where(Attempt.created_at >= thirty_days_ago)\\n                .group_by(func.date(Attempt.created_at))",
        "apply_admin_filters(select(func.date(Attempt.created_at), func.count(Attempt.id))\\n                .where(Attempt.created_at >= thirty_days_ago), Attempt, params)\\n                .group_by(func.date(Attempt.created_at))"
    ),
    (
        "select(Attempt.band_score)\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None))",
        "apply_admin_filters(select(Attempt.band_score)\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.band_score.isnot(None)), Attempt, params)"
    ),
    (
        "select(func.min(Attempt.time_limit_seconds - func.coalesce(func.cast(Attempt.attempt_metadata[\\\"remaining_seconds\\\"].as_string(), Integer), Attempt.time_limit_seconds)))\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.time_limit_seconds > 0)",
        "apply_admin_filters(select(func.min(Attempt.time_limit_seconds - func.coalesce(func.cast(Attempt.attempt_metadata[\\\"remaining_seconds\\\"].as_string(), Integer), Attempt.time_limit_seconds)))\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.time_limit_seconds > 0), Attempt, params)"
    ),
    (
        "select(func.avg(Attempt.raw_score / Attempt.max_score * 100.0))\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.max_score > 0)",
        "apply_admin_filters(select(func.avg(Attempt.raw_score / Attempt.max_score * 100.0))\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES), Attempt.max_score > 0), Attempt, params)"
    ),
    (
        "select(func.max(Attempt.band_score))\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES))",
        "apply_admin_filters(select(func.max(Attempt.band_score))\\n                .where(Attempt.status.in_(COMPLETED_ATTEMPT_STATUSES)), Attempt, params)"
    )
]

for old, new in replacements:
    content = content.replace(old, new)
    
file_path.write_text(content)
print("Replacements applied.")
