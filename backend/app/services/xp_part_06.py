from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.services.xp_dependencies import *
from app.services.xp_part_01 import ALL_TIME_PERIOD_START, LeaderboardSnapshot, PERIOD_ALL_TIME
from app.services.xp_part_02 import _period_datetime_bounds, _period_start

async def get_user_period_xp(session: AsyncSession, *, user_id: UUID, period_type: str, occurred_at: datetime | None = None) -> int:
    occurred_at = occurred_at or datetime.now(UTC)
    period_start, start_at, end_at = _period_datetime_bounds(period_type, occurred_at)
    if period_type == PERIOD_ALL_TIME:
        total_xp = (
            await session.execute(
                select(User.total_xp).where(User.id == user_id, User.deleted_at.is_(None))
            )
        ).scalar_one_or_none()
        if total_xp is not None:
            return max(0, int(total_xp or 0))

    filters = [
        XPTransaction.user_id == user_id,
        XPTransaction.counts_toward_leaderboard.is_(True),
    ]
    if start_at is not None:
        filters.append(XPTransaction.created_at >= start_at)
    if end_at is not None:
        filters.append(XPTransaction.created_at < end_at)

    live_total = (
        await session.execute(
            select(func.coalesce(func.sum(XPTransaction.xp_amount), 0)).where(*filters)
        )
    ).scalar_one()
    if int(live_total or 0) > 0:
        return max(0, int(live_total or 0))

    row = (
        await session.execute(
            select(LeaderboardEntry.xp_total).where(
                LeaderboardEntry.user_id == user_id,
                LeaderboardEntry.period_type == period_type,
                LeaderboardEntry.period_start == period_start,
            )
        )
    ).scalar_one_or_none()
    if row is not None:
        return int(row or 0)
    return max(0, int(live_total or 0))

async def _leaderboard_rows_from_transactions(
    session: AsyncSession,
    *,
    period_type: str,
    occurred_at: datetime,
) -> list[tuple[LeaderboardSnapshot, User]]:
    period_start, start_at, end_at = _period_datetime_bounds(period_type, occurred_at)
    users = (
        await session.scalars(
            select(User)
            .where(User.deleted_at.is_(None))
            .order_by(User.created_at.asc())
        )
    ).all()
    if not users:
        return []

    snapshots: dict[UUID, tuple[LeaderboardSnapshot, User]] = {
        user.id: (
            LeaderboardSnapshot(
                user_id=user.id,
                period_type=period_type,
                period_start=period_start,
            ),
            user,
        )
        for user in users
    }

    filters = [
        XPTransaction.counts_toward_leaderboard.is_(True),
        User.deleted_at.is_(None),
    ]
    if start_at is not None:
        filters.append(XPTransaction.created_at >= start_at)
    if end_at is not None:
        filters.append(XPTransaction.created_at < end_at)

    rows = (
        await session.execute(
            select(XPTransaction, User)
            .join(User, User.id == XPTransaction.user_id)
            .where(*filters)
            .order_by(XPTransaction.created_at.asc())
        )
    ).all()

    for transaction, user in rows:
        snapshot, _ = snapshots[user.id]
        xp_amount = int(transaction.xp_amount or 0)
        snapshot.xp_total += xp_amount
        snapshot.achieved_at = transaction.created_at

        metadata = transaction.metadata_json or {}
        score_value = metadata.get("score_value")
        if score_value is not None and metadata.get("track_score"):
            snapshot.score_events += 1
            snapshot.score_total += float(score_value)
            snapshot.average_score = round(snapshot.score_total / snapshot.score_events, 2)
        if metadata.get("full_mock_completed"):
            snapshot.full_mock_completions += 1
        snapshot.metadata_json = {
            **snapshot.metadata_json,
            "last_transaction_type": metadata.get("transaction_type"),
        }

    result: list[tuple[LeaderboardSnapshot, User]] = []
    for snapshot, user in snapshots.values():
        snapshot.xp_total = max(0, int(snapshot.xp_total or 0))
        result.append((snapshot, user))
    return result

async def _all_time_leaderboard_rows_from_users(
    session: AsyncSession,
) -> list[tuple[LeaderboardSnapshot, User]]:
    users = (
        await session.scalars(
            select(User)
            .where(User.deleted_at.is_(None))
            .order_by(User.total_xp.desc())
        )
    ).all()
    if not users:
        return []

    transaction_rows = (
        await session.execute(
            select(XPTransaction, User)
            .join(User, User.id == XPTransaction.user_id)
            .where(
                XPTransaction.counts_toward_leaderboard.is_(True),
                User.deleted_at.is_(None),
            )
            .order_by(XPTransaction.created_at.asc())
        )
    ).all()

    snapshots: dict[UUID, LeaderboardSnapshot] = {
        user.id: LeaderboardSnapshot(
            user_id=user.id,
            period_type=PERIOD_ALL_TIME,
            period_start=ALL_TIME_PERIOD_START,
            xp_total=max(0, int(user.total_xp or 0)),
        )
        for user in users
    }
    users_by_id = {user.id: user for user in users}

    for transaction, user in transaction_rows:
        snapshot = snapshots.get(user.id)
        if snapshot is None:
            continue
        snapshot.achieved_at = transaction.created_at
        metadata = transaction.metadata_json or {}
        score_value = metadata.get("score_value")
        if score_value is not None and metadata.get("track_score"):
            snapshot.score_events += 1
            snapshot.score_total += float(score_value)
            snapshot.average_score = round(snapshot.score_total / snapshot.score_events, 2)
        if metadata.get("full_mock_completed"):
            snapshot.full_mock_completions += 1
        snapshot.metadata_json = {
            **snapshot.metadata_json,
            "last_transaction_type": metadata.get("transaction_type"),
        }

    return [(snapshot, users_by_id[user_id]) for user_id, snapshot in snapshots.items()]

async def leaderboard_rows(
    session: AsyncSession,
    *,
    period_type: str,
    occurred_at: datetime | None = None,
) -> list[tuple[LeaderboardEntry | LeaderboardSnapshot, User]]:
    occurred_at = occurred_at or datetime.now(UTC)
    if period_type == PERIOD_ALL_TIME:
        live_all_time_rows = await _all_time_leaderboard_rows_from_users(session)
        if live_all_time_rows:
            return live_all_time_rows

    period_start = _period_start(period_type, occurred_at)
    rows = (
        await session.execute(
            select(LeaderboardEntry, User)
            .join(User, User.id == LeaderboardEntry.user_id)
            .where(
                LeaderboardEntry.period_type == period_type,
                LeaderboardEntry.period_start == period_start,
                User.deleted_at.is_(None),
            )
        )
    ).all()
    live_rows = await _leaderboard_rows_from_transactions(session, period_type=period_type, occurred_at=occurred_at)
    if live_rows:
        return live_rows
    return list(rows)
