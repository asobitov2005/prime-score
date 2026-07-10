from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.xp_dependencies import *
from app.services.xp_part_01 import DEFAULT_DAILY_CAP, FULL_MOCK_DAILY_CAP, PERIOD_ALL_TIME, PERIOD_MONTHLY, PERIOD_WEEKLY, STREAK_MILESTONES, TX_ADJUSTMENT, TX_FULL_MOCK_COMPLETION, TX_IMPROVEMENT_BONUS, calculate_level, format_xp_message
from app.services.xp_part_02 import _current_day_transactions, _ensure_user, _existing_transaction_for_component, _get_or_create_streak, _period_start

def _transaction_cap_exempt(transaction_type: str, amount: int, metadata: dict[str, object]) -> bool:
    if amount <= 0:
        return True
    if transaction_type == TX_ADJUSTMENT:
        return True
    return bool(metadata.get("cap_exempt"))

async def _daily_cap_limit(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
    daily_cap_override: int | None = None,
) -> int:
    if daily_cap_override is not None:
        return daily_cap_override
    rows = await _current_day_transactions(session, user_id, occurred_at)
    for row in rows:
        payload = row.metadata_json or {}
        if row.transaction_type == TX_FULL_MOCK_COMPLETION or payload.get("elevates_daily_cap"):
            return FULL_MOCK_DAILY_CAP
    return DEFAULT_DAILY_CAP

async def _daily_cap_consumed(session: AsyncSession, *, user_id: UUID, occurred_at: datetime) -> int:
    consumed = 0
    for row in await _current_day_transactions(session, user_id, occurred_at):
        payload = row.metadata_json or {}
        if _transaction_cap_exempt(row.transaction_type, int(row.xp_amount or 0), payload):
            continue
        consumed += max(0, int(row.xp_amount or 0))
    return consumed

async def _update_leaderboard_cache(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
    xp_amount: int,
    metadata: dict[str, object],
    counts_toward_leaderboard: bool,
) -> None:
    if xp_amount == 0 or not counts_toward_leaderboard:
        return

    for period_type in (PERIOD_WEEKLY, PERIOD_MONTHLY, PERIOD_ALL_TIME):
        period_start = _period_start(period_type, occurred_at)
        row = (
            await session.execute(
                select(LeaderboardEntry).where(
                    LeaderboardEntry.user_id == user_id,
                    LeaderboardEntry.period_type == period_type,
                    LeaderboardEntry.period_start == period_start,
                )
            )
        ).scalar_one_or_none()
        if row is None:
            row = LeaderboardEntry(
                user_id=user_id,
                period_type=period_type,
                period_start=period_start,
                xp_total=0,
                score_events=0,
                score_total=0.0,
                average_score=None,
                full_mock_completions=0,
                achieved_at=occurred_at,
                metadata_json={},
            )
            session.add(row)

        row.xp_total = max(0, int(row.xp_total or 0) + xp_amount)
        row.achieved_at = occurred_at
        score_value = metadata.get("score_value")
        if score_value is not None and metadata.get("track_score"):
            row.score_events = int(row.score_events or 0) + 1
            row.score_total = float(row.score_total or 0.0) + float(score_value)
            row.average_score = round(row.score_total / row.score_events, 2) if row.score_events > 0 else None
        if metadata.get("full_mock_completed"):
            row.full_mock_completions = int(row.full_mock_completions or 0) + 1
        row.metadata_json = {
            **(row.metadata_json or {}),
            "last_transaction_type": metadata.get("transaction_type"),
        }

async def create_xp_transaction(
    session: AsyncSession,
    user_id: UUID,
    transaction_type: str,
    amount: int,
    source_type: str,
    source_id: str | UUID | None,
    metadata: dict[str, object] | None = None,
    *,
    occurred_at: datetime | None = None,
    daily_cap_override: int | None = None,
) -> XPTransaction:
    occurred_at = occurred_at or datetime.now(UTC)
    payload = dict(metadata or {})
    payload["transaction_type"] = transaction_type

    existing = await _existing_transaction_for_component(
        session,
        user_id=user_id,
        transaction_type=transaction_type,
        source_type=source_type,
        source_id=source_id,
    )
    if existing is not None:
        return existing

    awarded_amount = int(amount)
    if not _transaction_cap_exempt(transaction_type, awarded_amount, payload):
        cap_limit = await _daily_cap_limit(
            session,
            user_id=user_id,
            occurred_at=occurred_at,
            daily_cap_override=daily_cap_override,
        )
        consumed = await _daily_cap_consumed(session, user_id=user_id, occurred_at=occurred_at)
        remaining = max(0, cap_limit - consumed)
        raw_amount = awarded_amount
        awarded_amount = min(raw_amount, remaining)
        payload["daily_cap_limit"] = cap_limit
        payload["daily_cap_consumed_before"] = consumed
        payload["daily_cap_remaining_before"] = remaining
        payload["raw_amount"] = raw_amount
        payload["cap_applied"] = awarded_amount < raw_amount
    else:
        payload["cap_applied"] = False

    flagged = bool(payload.get("flagged"))
    counts_toward_leaderboard = bool(payload.get("counts_toward_leaderboard", not flagged))
    transaction = XPTransaction(
        user_id=user_id,
        transaction_type=transaction_type,
        source_type=source_type,
        source_id=str(source_id) if source_id is not None else None,
        xp_amount=awarded_amount,
        counts_toward_leaderboard=counts_toward_leaderboard,
        metadata_json=payload,
        created_at=occurred_at,
    )
    session.add(transaction)

    user = await _ensure_user(session, user_id)
    current_total = max(0, int(user.total_xp or 0))
    level_before = int(user.current_level or calculate_level(current_total))
    next_total = max(0, current_total + awarded_amount)
    user.total_xp = next_total
    user.current_level = calculate_level(next_total)
    await _update_leaderboard_cache(
        session,
        user_id=user_id,
        occurred_at=occurred_at,
        xp_amount=awarded_amount,
        metadata=payload,
        counts_toward_leaderboard=counts_toward_leaderboard,
    )
    payload["level_before"] = level_before
    payload["level_after"] = int(user.current_level or 1)
    payload["message"] = format_xp_message(transaction_type, awarded_amount, payload)
    transaction.metadata_json = payload
    await session.flush()
    return transaction

async def createXpTransaction(
    session: AsyncSession,
    userId: UUID,
    type: str,
    amount: int,
    sourceType: str,
    sourceId: str | UUID | None,
    metadata: dict[str, object] | None = None,
) -> XPTransaction:
    return await create_xp_transaction(
        session,
        user_id=userId,
        transaction_type=type,
        amount=amount,
        source_type=sourceType,
        source_id=sourceId,
        metadata=metadata,
    )

async def _register_meaningful_activity(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
) -> tuple[int, int, int, int]:
    streak = await _get_or_create_streak(session, user_id)
    activity_date = occurred_at.date()
    current_streak = int(streak.current_streak or 0)
    best_streak = int(streak.best_streak or 0)
    awarded = list(streak.awarded_milestones or [])

    if streak.last_activity_date == activity_date:
        return 0, 0, current_streak, best_streak

    if streak.last_activity_date == activity_date - timedelta(days=1):
        current_streak += 1
    else:
        current_streak = 1

    best_streak = max(best_streak, current_streak)
    milestone_bonus = 0
    if current_streak in STREAK_MILESTONES and current_streak not in awarded:
        milestone_bonus = STREAK_MILESTONES[current_streak]
        awarded.append(current_streak)

    streak.current_streak = current_streak
    streak.best_streak = best_streak
    streak.last_activity_date = activity_date
    streak.last_activity_at = occurred_at
    streak.awarded_milestones = sorted(set(int(item) for item in awarded))

    user = await _ensure_user(session, user_id)
    user.current_streak = current_streak
    user.best_streak = best_streak
    await session.flush()
    return 25, milestone_bonus, current_streak, best_streak

async def _improvement_bonus_already_awarded(
    session: AsyncSession,
    *,
    user_id: UUID,
    occurred_at: datetime,
    skill_key: str,
) -> bool:
    for row in await _current_day_transactions(session, user_id, occurred_at):
        if row.transaction_type != TX_IMPROVEMENT_BONUS:
            continue
        if str((row.metadata_json or {}).get("skill_key") or "") == skill_key:
            return True
    return False

async def _get_latest_attempt_for_skill(
    session: AsyncSession,
    *,
    user_id: UUID,
    test_type: object,
    exclude_attempt_id: UUID,
    before: datetime | None = None,
) -> Attempt | None:
    filters = [
        Attempt.user_id == user_id,
        Attempt.id != exclude_attempt_id,
        Attempt.test_type == test_type,
        Attempt.submitted_at.is_not(None),
    ]
    if before is not None:
        filters.append(Attempt.submitted_at < before)
    rows = await session.scalars(
        select(Attempt)
        .where(*filters)
        .order_by(Attempt.submitted_at.desc(), Attempt.created_at.desc())
        .limit(1)
    )
    return rows.first()
