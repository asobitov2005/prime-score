from __future__ import annotations

from datetime import UTC, datetime, timedelta
from math import ceil
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user
from app.db.session import get_db_session
from app.models.attempt import Attempt
from app.models.enums import AttemptScope, AttemptStatus
from app.models.user import User
from app.schemas.common import DebugPrincipal
from app.schemas.leaderboard import (
    LeaderboardEntryRead,
    LeaderboardResponse,
    LeaderboardUserAchievementRead,
    LeaderboardUserBadgeRead,
    LeaderboardUserProfileRead,
    LeaderboardUserStatsRead,
)
from app.services.xp import (
    PERIOD_ALL_TIME,
    PERIOD_MONTHLY,
    PERIOD_WEEKLY,
    badge_for_user,
    get_user_period_xp,
    leaderboard_rows,
)

router = APIRouter()

PUBLIC_PERIOD_MAP = {
    "week": PERIOD_WEEKLY,
    "month": PERIOD_MONTHLY,
    "all_time": PERIOD_ALL_TIME,
}


def _display_name(user: User) -> str:
    full_name = " ".join(part for part in [user.first_name, user.last_name] if part).strip()
    if full_name:
        return full_name
    if user.username:
        return user.username
    return "Anonymous Candidate"


def _badge_rarity(title: str | None) -> str:
    if not title:
        return "Common"
    if title in {"Prime Legend"}:
        return "Mythic"
    if title in {"Platinum Master", "30 Day Streak"}:
        return "Legendary"
    if title in {"Gold Achiever", "Mock Master"}:
        return "Epic"
    if title in {"Silver Scholar", "Consistency Builder"}:
        return "Rare"
    return "Common"


def _badge_tagline(title: str | None) -> str:
    if not title:
        return "Complete more practice to unlock your first badge."
    return {
        "Bronze Learner": "Your journey begins.",
        "Silver Scholar": "Consistency builds greatness.",
        "Gold Achiever": "Proof of serious dedication.",
        "Platinum Master": "Elite discipline unlocked.",
        "Prime Legend": "Reserved for the truly relentless.",
        "30 Day Streak": "A month of consistent IELTS practice.",
        "Consistency Builder": "A full week of showing up.",
        "Mock Master": "Proven full mock discipline.",
    }.get(title, "Earned through real PrimeScore progress.")


def _achievement_id(title: str) -> str:
    return title.lower().replace("#", "").replace("%", "").replace(" ", "-")


def _badge_image(title: str | None) -> str | None:
    if not title:
        return None
    return {
        "Bronze Learner": "/badges/level/badge-level-bronze-learner.png",
        "Silver Scholar": "/badges/level/badge-level-silver-scholar.png",
        "Gold Achiever": "/badges/level/badge-level-gold-achiever.png",
        "Platinum Master": "/badges/level/badge-level-platinum-master.png",
        "Prime Legend": "/badges/level/badge-level-prime-legend.png",
        "3 Day Streak": "/badges/streak/day-3.png",
        "7 Day Warrior": "/badges/streak/day-7.png",
        "14 Day Consistent Learner": "/badges/streak/day-14.png",
        "30 Day Streak": "/badges/streak/day-30.png",
        "60 Day Discipline Master": "/badges/streak/day-60.png",
        "90 Day Unbreakable": "/badges/streak/day-60.png",
        "180 Day Iron Mind": "/badges/streak/day-180.png",
        "365 Day Prime Legend": "/badges/streak/day-360.png",
        "Reading Beast": "/badges/skill/reading.png",
        "Perfect Listening": "/badges/skill/listening.png",
        "Writing Excellence": "/badges/skill/writing.png",
        "Accuracy Monster": "/badges/performance/performance-accuracy-monster.png",
        "Mock Warrior": "/badges/special/special-mock-warrior.png",
        "Mock Addict": "/badges/special/special-mock-addict.png",
        "Early Supporter": "/badges/special/special-early-supporter.png",
        "Weekly Top 10": "/badges/special/special-weekly-top-10.png",
        "Rank #1": "/badges/special/special-rank-1.png",
        "Top 1%": "/badges/special/special-top-1.png",
        "XP Hunter": "/badges/special/special-xp-hunter.png",
        "XP Machine": "/badges/special/special-xp-machine.png",
        "Weekend Grinder": "/badges/special/special-weekend-grinder.png",
        "Early Bird": "/badges/special/special-early-bird.png",
        "Night Owl": "/badges/special/special-night-owl.png",
    }.get(title)


def _attempt_type(attempt: Attempt) -> str:
    value = attempt.test_type
    return str(getattr(value, "value", value))


def _attempt_accuracy(attempt: Attempt) -> float | None:
    if attempt.raw_score is None or int(attempt.max_score or 0) <= 0:
        return None
    return (int(attempt.raw_score or 0) / max(1, int(attempt.max_score or 0))) * 100


def _rarity_for_streak_days(days: int) -> str:
    if days >= 180:
        return "Mythic"
    if days >= 60:
        return "Legendary"
    if days >= 14:
        return "Epic"
    if days >= 7:
        return "Rare"
    return "Common"


def _achievement(title: str, rarity: str | None = None) -> LeaderboardUserAchievementRead:
    return LeaderboardUserAchievementRead(
        id=_achievement_id(title),
        title=title,
        rarity=rarity or _badge_rarity(title),
        image=_badge_image(title),
    )


def _unlocked_achievements(
    *,
    user: User,
    attempts: list[Attempt],
    full_mock_completions: int,
    rank: int,
    weekly_rank: int | None,
    leaderboard_size: int,
) -> list[LeaderboardUserAchievementRead]:
    level = int(user.current_level or 1)
    total_xp = int(user.total_xp or 0)
    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or current_streak or 0)

    unlocked_titles: dict[str, str] = {}

    def add(title: str, rarity: str | None = None) -> None:
        unlocked_titles.setdefault(title, rarity or _badge_rarity(title))

    level_badges = [
        (5, 500, "Bronze Learner"),
        (10, 2_000, "Silver Scholar"),
        (15, 5_000, "Gold Achiever"),
        (20, 10_000, "Platinum Master"),
        (30, 25_000, "Prime Legend"),
    ]
    for required_level, required_xp, title in level_badges:
        if level >= required_level and total_xp >= required_xp:
            add(title)

    streak_badges = [
        (3, "3 Day Streak"),
        (7, "7 Day Warrior"),
        (14, "14 Day Consistent Learner"),
        (30, "30 Day Streak"),
        (60, "60 Day Discipline Master"),
        (90, "90 Day Unbreakable"),
        (180, "180 Day Iron Mind"),
        (365, "365 Day Prime Legend"),
    ]
    for days, title in streak_badges:
        if best_streak >= days:
            add(title, _rarity_for_streak_days(days))

    reading_attempts = [attempt for attempt in attempts if _attempt_type(attempt) == "reading"]
    listening_attempts = [attempt for attempt in attempts if _attempt_type(attempt) == "listening"]
    writing_attempts = [attempt for attempt in attempts if _attempt_type(attempt) == "writing"]
    reading_accuracies = [accuracy for attempt in reading_attempts if (accuracy := _attempt_accuracy(attempt)) is not None]
    full_mock_attempts = [
        attempt
        for attempt in attempts
        if attempt.scope == AttemptScope.FULL or bool((attempt.attempt_metadata or {}).get("is_full_mock"))
    ]
    full_mock_accuracies = [accuracy for attempt in full_mock_attempts[-5:] if (accuracy := _attempt_accuracy(attempt)) is not None]

    if len(reading_attempts) >= 20 and reading_accuracies and (sum(reading_accuracies) / len(reading_accuracies)) >= 75:
        add("Reading Beast", "Epic")
    if any(
        _attempt_type(attempt) == "listening"
        and attempt.raw_score is not None
        and int(attempt.max_score or 0) > 0
        and int(attempt.raw_score or 0) >= int(attempt.max_score or 0)
        for attempt in listening_attempts
    ):
        add("Perfect Listening", "Legendary")
    if len(writing_attempts) >= 10 and max((float(attempt.band_score or 0) for attempt in writing_attempts), default=0) >= 7:
        add("Writing Excellence", "Rare")
    if len(full_mock_accuracies) >= 5 and (sum(full_mock_accuracies) / len(full_mock_accuracies)) >= 90:
        add("Accuracy Monster", "Legendary")

    if full_mock_completions >= 10:
        add("Mock Warrior", "Rare")
    if full_mock_completions >= 50:
        add("Mock Addict", "Epic")
    if user.created_at and user.created_at.date().isoformat() <= "2026-05-01":
        add("Early Supporter", "Legendary")
    if weekly_rank is not None and 0 < weekly_rank <= 10:
        add("Weekly Top 10", "Epic")
    if rank == 1:
        add("Rank #1", "Mythic")
    if rank > 0 and leaderboard_size > 0 and rank <= max(1, ceil(leaderboard_size * 0.01)):
        add("Top 1%", "Mythic")
    if total_xp >= 2_000:
        add("XP Hunter", "Rare")
    if total_xp >= 10_000:
        add("XP Machine", "Legendary")

    weekend_days = {
        attempt.created_at.date()
        for attempt in attempts
        if attempt.created_at.weekday() in {5, 6}
    }
    early_sessions = [attempt for attempt in attempts if attempt.created_at.astimezone(UTC).hour < 8]
    late_sessions = [attempt for attempt in attempts if attempt.created_at.astimezone(UTC).hour >= 22]
    if len(weekend_days) >= 2:
        add("Weekend Grinder", "Common")
    if len(early_sessions) >= 10:
        add("Early Bird", "Common")
    if len(late_sessions) >= 10:
        add("Night Owl", "Common")

    return [
        _achievement(title, rarity)
        for title, rarity in unlocked_titles.items()
    ]


def _sort_key(item: tuple[object, User]) -> tuple[float, int, float, int, float]:
    entry, user = item
    achieved_at = getattr(entry, "achieved_at", None)
    achieved_rank = achieved_at.timestamp() if achieved_at is not None else float("inf")
    return (
        float(getattr(entry, "xp_total", 0) or 0),
        int(getattr(user, "current_streak", 0) or 0),
        float(getattr(entry, "average_score", 0.0) or 0.0),
        int(getattr(entry, "full_mock_completions", 0) or 0),
        -achieved_rank,
    )


def _serialize_row(
    *,
    row,
    user: User,
    rank: int,
    is_current_user: bool,
) -> LeaderboardEntryRead:
    return LeaderboardEntryRead(
        rank=rank,
        user_id=user.id,
        avatar_url=user.avatar_url,
        display_name=_display_name(user),
        level=int(user.current_level or 1),
        xp=int(row.xp_total or 0),
        current_streak=int(user.current_streak or 0),
        badge=badge_for_user(
            level=int(user.current_level or 1),
            current_streak=int(user.current_streak or 0),
            full_mock_completions=int(row.full_mock_completions or 0),
        ),
        average_score=round(float(row.average_score), 2) if row.average_score is not None else None,
        full_mock_completions=int(row.full_mock_completions or 0),
        achieved_at=row.achieved_at,
        is_current_user=is_current_user,
        show_on_leaderboard=bool(user.show_on_leaderboard),
    )


@router.get("", response_model=LeaderboardResponse)
async def get_leaderboard(
    period: str = Query(default="all_time"),
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    type: str | None = Query(default=None),
) -> LeaderboardResponse:
    _ = type
    internal_period = PUBLIC_PERIOD_MAP.get(period)
    if internal_period is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported leaderboard period.")

    rows = await leaderboard_rows(session, period_type=internal_period)
    sorted_rows = sorted(rows, key=_sort_key, reverse=True)

    visible_items: list[LeaderboardEntryRead] = []
    current_user_entry: LeaderboardEntryRead | None = None

    for index, (row, user) in enumerate(sorted_rows, start=1):
        entry = _serialize_row(
            row=row,
            user=user,
            rank=index,
            is_current_user=user.id == current_user.id,
        )
        if user.id == current_user.id:
            current_user_entry = entry
        if bool(user.show_on_leaderboard):
            visible_items.append(entry)

    if current_user_entry is None:
        user = await session.get(User, current_user.id)
        if user is not None:
            period_xp = (
                int(user.total_xp or 0)
                if internal_period == PERIOD_ALL_TIME
                else await get_user_period_xp(session, user_id=user.id, period_type=internal_period)
            )
            current_user_entry = LeaderboardEntryRead(
                rank=0,
                user_id=user.id,
                avatar_url=user.avatar_url,
                display_name=_display_name(user),
                level=int(user.current_level or 1),
                xp=period_xp,
                current_streak=int(user.current_streak or 0),
                badge=badge_for_user(
                    level=int(user.current_level or 1),
                    current_streak=int(user.current_streak or 0),
                    full_mock_completions=0,
                ),
                average_score=None,
                full_mock_completions=0,
                achieved_at=None,
                is_current_user=True,
                show_on_leaderboard=bool(user.show_on_leaderboard),
            )

    return LeaderboardResponse(
        period=period,
        generated_at=datetime.now(UTC),
        items=visible_items,
        current_user=current_user_entry,
    )


@router.get("/users/{user_id}", response_model=LeaderboardUserProfileRead)
async def get_leaderboard_user_profile(
    user_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> LeaderboardUserProfileRead:
    user = await session.get(User, user_id)
    if user is None or user.deleted_at is not None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    if user.id != current_user.id and not bool(user.show_on_leaderboard):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    rows = await leaderboard_rows(session, period_type=PERIOD_ALL_TIME)
    sorted_rows = sorted(rows, key=_sort_key, reverse=True)
    rank = next((index for index, (_, row_user) in enumerate(sorted_rows, start=1) if row_user.id == user.id), 0)
    leaderboard_size = len(sorted_rows)
    weekly_rows = await leaderboard_rows(session, period_type=PERIOD_WEEKLY)
    weekly_sorted_rows = sorted(weekly_rows, key=_sort_key, reverse=True)
    weekly_rank = next((index for index, (_, row_user) in enumerate(weekly_sorted_rows, start=1) if row_user.id == user.id), None)

    completed_statuses = {AttemptStatus.COMPLETED, AttemptStatus.AUTO_SUBMITTED}
    attempts = list(
        (
            await session.scalars(
                select(Attempt)
                .where(Attempt.user_id == user.id, Attempt.status.in_(completed_statuses))
                .order_by(Attempt.submitted_at.desc().nullslast(), Attempt.created_at.desc())
            )
        ).all()
    )

    total_time_seconds = sum(
        max(0, int((attempt.attempt_metadata or {}).get("time_spent_sec", 0) or 0))
        for attempt in attempts
    )
    scored_attempts = [attempt for attempt in attempts if attempt.band_score is not None]
    highest_band = max((float(attempt.band_score or 0) for attempt in scored_attempts), default=None)
    accuracy_values = [
        (int(attempt.raw_score or 0) / max(1, int(attempt.max_score or 0))) * 100
        for attempt in attempts
        if attempt.raw_score is not None and int(attempt.max_score or 0) > 0
    ]
    accuracy = round(sum(accuracy_values) / len(accuracy_values), 1) if accuracy_values else None
    total_mock_tests = sum(
        1
        for attempt in attempts
        if attempt.scope == AttemptScope.FULL or bool((attempt.attempt_metadata or {}).get("is_full_mock"))
    )

    equipped_badge_title = badge_for_user(
        level=int(user.current_level or 1),
        current_streak=int(user.current_streak or 0),
        full_mock_completions=total_mock_tests,
    )
    equipped_badge = (
        LeaderboardUserBadgeRead(
            title=equipped_badge_title,
            rarity=_badge_rarity(equipped_badge_title),
            tagline=_badge_tagline(equipped_badge_title),
            image=_badge_image(equipped_badge_title),
        )
        if equipped_badge_title
        else None
    )
    achievements = _unlocked_achievements(
        user=user,
        attempts=attempts,
        full_mock_completions=total_mock_tests,
        rank=rank,
        weekly_rank=weekly_rank,
        leaderboard_size=leaderboard_size,
    )

    return LeaderboardUserProfileRead(
        user_id=user.id,
        avatar_url=user.avatar_url,
        display_name=_display_name(user),
        level=int(user.current_level or 1),
        total_xp=int(user.total_xp or 0),
        rank=rank,
        is_online=bool(user.last_active_at and user.last_active_at >= datetime.now(UTC) - timedelta(minutes=5)),
        is_premium=bool(user.is_premium),
        current_streak=int(user.current_streak or 0),
        equipped_badge=equipped_badge,
        active_titles=[equipped_badge_title] if equipped_badge_title else [],
        stats=LeaderboardUserStatsRead(
            longest_streak=int(user.best_streak or user.current_streak or 0),
            highest_band=round(highest_band, 1) if highest_band is not None else None,
            total_mock_tests=total_mock_tests,
            total_study_hours=total_time_seconds // 3600,
            accuracy=accuracy,
            achievements_unlocked=len(achievements),
        ),
        achievements=achievements,
    )
