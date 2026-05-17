from __future__ import annotations

import argparse
import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Literal

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session_maker
from app.models import gamification  # noqa: F401 - ensure tables are registered
from app.models.attempt import Attempt
from app.models.enums import AttemptStatus
from app.models.gamification import LeaderboardEntry, Streak, XPTransaction
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission, WritingTask
from app.services.xp import (
    TX_ADJUSTMENT,
    _update_leaderboard_cache,
    award_xp_for_attempt,
    award_xp_for_writing_submission,
    calculate_level,
)


ActivityKind = Literal["attempt", "writing"]


@dataclass(slots=True)
class BackfillActivity:
    occurred_at: datetime
    created_at: datetime
    kind: ActivityKind
    payload: object


def _safe_datetime(value: datetime | None) -> datetime:
    if value is None:
        return datetime.min.replace(tzinfo=UTC)
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


async def _reset_generated_xp(session: AsyncSession) -> None:
    await session.execute(delete(XPTransaction).where(XPTransaction.transaction_type != TX_ADJUSTMENT))
    await session.execute(delete(LeaderboardEntry))
    await session.execute(delete(Streak))

    users = list((await session.scalars(select(User))).all())
    for user in users:
        user.total_xp = 0
        user.current_level = 1
        user.current_streak = 0
        user.best_streak = 0

    adjustments = list(
        (
            await session.scalars(
                select(XPTransaction)
                .where(XPTransaction.transaction_type == TX_ADJUSTMENT)
                .order_by(XPTransaction.created_at.asc(), XPTransaction.id.asc())
            )
        ).all()
    )
    for transaction in adjustments:
        user = await session.get(User, transaction.user_id)
        if user is None:
            continue
        user.total_xp = max(0, int(user.total_xp or 0) + int(transaction.xp_amount or 0))
        user.current_level = calculate_level(int(user.total_xp or 0))
        await _update_leaderboard_cache(
            session,
            user_id=transaction.user_id,
            occurred_at=_safe_datetime(transaction.created_at),
            xp_amount=int(transaction.xp_amount or 0),
            metadata=transaction.metadata_json or {},
            counts_toward_leaderboard=bool(transaction.counts_toward_leaderboard),
        )
    await session.flush()


async def _load_activities(session: AsyncSession) -> list[BackfillActivity]:
    activities: list[BackfillActivity] = []

    attempts = list(
        (
            await session.scalars(
                select(Attempt)
                .where(
                    Attempt.status.in_([AttemptStatus.COMPLETED, AttemptStatus.AUTO_SUBMITTED]),
                    Attempt.submitted_at.is_not(None),
                    Attempt.raw_score.is_not(None),
                )
                .order_by(Attempt.submitted_at.asc(), Attempt.created_at.asc(), Attempt.id.asc())
            )
        ).all()
    )
    activities.extend(
        BackfillActivity(
            occurred_at=_safe_datetime(attempt.submitted_at),
            created_at=_safe_datetime(attempt.created_at),
            kind="attempt",
            payload=attempt,
        )
        for attempt in attempts
    )

    writing_rows = list(
        (
            await session.execute(
                select(WritingSubmission, WritingEvaluation, WritingTask)
                .join(WritingEvaluation, WritingEvaluation.submission_id == WritingSubmission.id)
                .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
                .where(WritingSubmission.submitted_at.is_not(None))
                .order_by(WritingSubmission.submitted_at.asc(), WritingSubmission.created_at.asc(), WritingSubmission.id.asc())
            )
        ).all()
    )
    activities.extend(
        BackfillActivity(
            occurred_at=_safe_datetime(submission.submitted_at),
            created_at=_safe_datetime(submission.created_at),
            kind="writing",
            payload=(submission, evaluation, task),
        )
        for submission, evaluation, task in writing_rows
    )

    activities.sort(key=lambda item: (item.occurred_at, item.created_at, item.kind))
    return activities


async def backfill_xp(*, reset_existing: bool, batch_size: int) -> dict[str, int]:
    session_maker = get_session_maker()
    counts = {
        "activities": 0,
        "attempts": 0,
        "writing": 0,
        "xp_awarded": 0,
    }

    async with session_maker() as session:
        if reset_existing:
            await _reset_generated_xp(session)
            await session.commit()

        activities = await _load_activities(session)
        for index, activity in enumerate(activities, start=1):
            if activity.kind == "attempt":
                attempt = activity.payload
                result = await award_xp_for_attempt(session, attempt)  # type: ignore[arg-type]
                metadata = dict(attempt.attempt_metadata or {})  # type: ignore[attr-defined]
                metadata["xp_awarded_total"] = result.total_awarded
                metadata["xp_breakdown"] = result.breakdown
                metadata["xp_level_after"] = result.level_after
                metadata["xp_current_streak"] = result.current_streak
                metadata["xp_backfilled_at"] = datetime.now(UTC).isoformat()
                attempt.attempt_metadata = metadata  # type: ignore[attr-defined]
                counts["attempts"] += 1
            else:
                submission, evaluation, task = activity.payload  # type: ignore[misc]
                result = await award_xp_for_writing_submission(session, submission, evaluation, task)
                counts["writing"] += 1

            counts["activities"] += 1
            counts["xp_awarded"] += int(result.total_awarded or 0)

            if index % batch_size == 0:
                await session.commit()
                print(f"Processed {index}/{len(activities)} activities...")

        await session.commit()
    return counts


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Backfill PrimeScore XP from historical attempts and writing submissions.")
    parser.add_argument(
        "--reset-existing",
        action="store_true",
        help="Delete generated XP transactions/cache first, preserve ADJUSTMENT transactions, then rebuild chronologically.",
    )
    parser.add_argument("--batch-size", type=int, default=100, help="Commit after this many activities.")
    return parser.parse_args()


async def main() -> None:
    args = parse_args()
    counts = await backfill_xp(reset_existing=bool(args.reset_existing), batch_size=max(1, int(args.batch_size)))
    print(
        "XP backfill complete: "
        f"{counts['activities']} activities, "
        f"{counts['attempts']} attempts, "
        f"{counts['writing']} writing submissions, "
        f"{counts['xp_awarded']} XP awarded/replayed."
    )


if __name__ == "__main__":
    asyncio.run(main())
