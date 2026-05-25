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
from app.models.speaking import SpeakingSession
from app.models.user import User
from app.models.writing import WritingEvaluation, WritingSubmission
from app.schemas.common import DebugPrincipal
from app.schemas.leaderboard import (
    LeaderboardEntryRead,
    LeaderboardResponse,
    LeaderboardUserAchievementRead,
    LeaderboardUserAchievementProgressRead,
    LeaderboardUserAchievementStateRead,
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


def _catalog_progress(current: int, target: int, label: str) -> LeaderboardUserAchievementProgressRead:
    return LeaderboardUserAchievementProgressRead(
        current=max(0, int(current)),
        target=max(0, int(target)),
        label=label,
    )


def _catalog_status(*, unlocked: bool, started: bool) -> str:
    if unlocked:
        return "unlocked"
    if started:
        return "in_progress"
    return "locked"


def _catalog_achievement(
    *,
    id: str,
    title: str,
    description: str,
    category: str,
    rarity: str,
    image: str,
    requirement: str,
    status: str,
    skill_type: str | None = None,
    required_xp: int | None = None,
    unlock_level: int | None = None,
    streak_days: int | None = None,
    xp_reward: int | None = None,
    progress: LeaderboardUserAchievementProgressRead | None = None,
) -> LeaderboardUserAchievementStateRead:
    return LeaderboardUserAchievementStateRead(
        id=id,
        title=title,
        description=description,
        category=category,
        skill_type=skill_type,
        rarity=rarity,
        image=image,
        status=status,
        requirement=requirement,
        required_xp=required_xp,
        unlock_level=unlock_level,
        streak_days=streak_days,
        xp_reward=xp_reward,
        progress=progress,
    )


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


def _build_achievement_catalog(
    *,
    user: User,
    reading_attempt_count: int,
    reading_average_accuracy: float | None,
    listening_perfect_score_reached: bool,
    listening_best_score: int,
    listening_best_target: int,
    writing_submission_count: int,
    writing_best_band: float | None,
    speaking_completed_count: int,
    recent_full_mock_accuracy: float | None,
    recent_full_mock_count: int,
    full_mock_completions: int,
    weekend_day_count: int,
    early_session_count: int,
    late_session_count: int,
    rank: int,
    weekly_rank: int | None,
    leaderboard_size: int,
) -> list[LeaderboardUserAchievementStateRead]:
    level = int(user.current_level or 1)
    total_xp = int(user.total_xp or 0)
    current_streak = int(user.current_streak or 0)
    best_streak = int(user.best_streak or current_streak or 0)
    top_one_percent_cutoff = max(1, ceil(leaderboard_size * 0.01)) if leaderboard_size > 0 else 1

    level_started = level > 1 or total_xp > 0
    catalog: list[LeaderboardUserAchievementStateRead] = []

    def add_level(
        *,
        id: str,
        title: str,
        description: str,
        rarity: str,
        image: str,
        required_level: int,
        required_xp: int,
        xp_reward: int,
    ) -> None:
        unlocked = level >= required_level and total_xp >= required_xp
        started = level_started
        progress = (
            _catalog_progress(total_xp, required_xp, f"Level {level} / {required_level} • {total_xp:,} / {required_xp:,} XP")
            if started and not unlocked
            else None
        )
        catalog.append(
            _catalog_achievement(
                id=id,
                title=title,
                description=description,
                category="level",
                rarity=rarity,
                image=image,
                requirement=f"Reach Level {required_level} and earn {required_xp:,} XP.",
                status=_catalog_status(unlocked=unlocked, started=started),
                required_xp=required_xp,
                unlock_level=required_level,
                xp_reward=xp_reward,
                progress=progress,
            )
        )

    add_level(
        id="level-bronze-learner",
        title="Bronze Learner",
        description="Your journey begins.",
        rarity="Common",
        image="/badges/level/badge-level-bronze-learner.png",
        required_level=5,
        required_xp=500,
        xp_reward=50,
    )
    add_level(
        id="level-silver-scholar",
        title="Silver Scholar",
        description="Consistency builds greatness.",
        rarity="Rare",
        image="/badges/level/badge-level-silver-scholar.png",
        required_level=10,
        required_xp=2_000,
        xp_reward=150,
    )
    add_level(
        id="level-gold-achiever",
        title="Gold Achiever",
        description="Proof of serious dedication.",
        rarity="Epic",
        image="/badges/level/badge-level-gold-achiever.png",
        required_level=15,
        required_xp=5_000,
        xp_reward=350,
    )
    add_level(
        id="level-platinum-master",
        title="Platinum Master",
        description="Elite discipline unlocked.",
        rarity="Legendary",
        image="/badges/level/badge-level-platinum-master.png",
        required_level=20,
        required_xp=10_000,
        xp_reward=750,
    )
    add_level(
        id="level-prime-legend",
        title="Prime Legend",
        description="Reserved for the truly relentless.",
        rarity="Mythic",
        image="/badges/level/badge-level-prime-legend.png",
        required_level=30,
        required_xp=25_000,
        xp_reward=2_000,
    )

    def add_streak(
        *,
        id: str,
        title: str,
        description: str,
        days: int,
        xp_reward: int,
    ) -> None:
        unlocked = best_streak >= days
        started = best_streak > 0
        progress = (
            _catalog_progress(best_streak, days, f"{best_streak} of {days} days")
            if started and not unlocked
            else None
        )
        catalog.append(
            _catalog_achievement(
                id=id,
                title=title,
                description=description,
                category="streak",
                rarity=_rarity_for_streak_days(days),
                image=(
                    "/badges/streak/day-3.png" if days == 3 else
                    "/badges/streak/day-7.png" if days == 7 else
                    "/badges/streak/day-14.png" if days == 14 else
                    "/badges/streak/day-30.png" if days == 30 else
                    "/badges/streak/day-60.png" if days in {60, 90} else
                    "/badges/streak/day-180.png" if days == 180 else
                    "/badges/streak/day-360.png"
                ),
                requirement=f"Practice for {days} consecutive days.",
                status=_catalog_status(unlocked=unlocked, started=started),
                streak_days=days,
                xp_reward=xp_reward,
                progress=progress,
            )
        )

    add_streak(id="streak-3-day", title="Starter Streak", description="Three days of focused practice in a row.", days=3, xp_reward=60)
    add_streak(id="streak-7-warrior", title="Warrior", description="One full week of IELTS discipline.", days=7, xp_reward=120)
    add_streak(id="streak-14-consistent", title="Consistent Learner", description="Consistency is becoming part of your identity.", days=14, xp_reward=220)
    add_streak(id="streak-30-beast", title="Monthly Beast", description="A full month of showing up for your IELTS goal.", days=30, xp_reward=420)
    add_streak(id="streak-60-discipline", title="Discipline Master", description="Two months of serious preparation rhythm.", days=60, xp_reward=700)
    add_streak(id="streak-90-unbreakable", title="Unbreakable", description="A streak that shows rare commitment.", days=90, xp_reward=900)
    add_streak(id="streak-180-iron-mind", title="Iron Mind", description="Half a year of relentless exam preparation.", days=180, xp_reward=1_500)
    add_streak(id="streak-365-prime-legend", title="365 Day Prime Legend", description="The ultimate yearly consistency achievement.", days=365, xp_reward=3_000)

    reading_unlocked = reading_attempt_count >= 20 and (reading_average_accuracy or 0) >= 75
    reading_started = reading_attempt_count > 0
    catalog.append(
        _catalog_achievement(
            id="skill-reading-beast",
            title="Reading Beast",
            description="Show strong command of IELTS Reading practice.",
            category="skill",
            skill_type="reading",
            rarity="Epic",
            image="/badges/skill/reading.png",
            requirement="Complete 20 Reading tests with 75%+ average accuracy.",
            status=_catalog_status(unlocked=reading_unlocked, started=reading_started),
            xp_reward=360,
            progress=(
                _catalog_progress(
                    min(reading_attempt_count, 20),
                    20,
                    f"{reading_attempt_count} of 20 tests • {(reading_average_accuracy or 0):.0f}% avg accuracy",
                )
                if reading_started and not reading_unlocked
                else None
            ),
        )
    )

    listening_started = listening_best_target > 0 or listening_best_score > 0
    catalog.append(
        _catalog_achievement(
            id="skill-perfect-listening",
            title="Perfect Listening",
            description="Develop exam-ready listening accuracy.",
            category="skill",
            skill_type="listening",
            rarity="Legendary",
            image="/badges/skill/listening.png",
            requirement="Score 40/40 on a Listening mock.",
            status=_catalog_status(unlocked=listening_perfect_score_reached, started=listening_started),
            xp_reward=600,
            progress=(
                _catalog_progress(
                    listening_best_score,
                    listening_best_target,
                    f"Best score: {listening_best_score} / {listening_best_target}",
                )
                if listening_started and not listening_perfect_score_reached and listening_best_target > 0
                else None
            ),
        )
    )

    writing_started = writing_submission_count > 0
    writing_unlocked = writing_submission_count >= 10 and (writing_best_band or 0) >= 7
    catalog.append(
        _catalog_achievement(
            id="skill-writing-excellence",
            title="Writing Excellence",
            description="Produce high-quality writing with clear improvement.",
            category="skill",
            skill_type="writing",
            rarity="Rare",
            image="/badges/skill/writing.png",
            requirement="Submit 10 Writing tasks and reach Band 7.0.",
            status=_catalog_status(unlocked=writing_unlocked, started=writing_started),
            xp_reward=300,
            progress=(
                _catalog_progress(
                    min(writing_submission_count, 10),
                    10,
                    f"{writing_submission_count} of 10 submissions • best band {(writing_best_band or 0):.1f}",
                )
                if writing_started and not writing_unlocked
                else None
            ),
        )
    )

    speaking_started = speaking_completed_count > 0
    speaking_unlocked = speaking_completed_count >= 12
    catalog.append(
        _catalog_achievement(
            id="skill-speaking-elite",
            title="Speaking Elite",
            description="Build fluent and confident IELTS Speaking responses.",
            category="skill",
            skill_type="speaking",
            rarity="Rare",
            image="/badges/skill/speaking.png",
            requirement="Complete 12 Speaking mocks.",
            status=_catalog_status(unlocked=speaking_unlocked, started=speaking_started),
            xp_reward=320,
            progress=(
                _catalog_progress(speaking_completed_count, 12, f"{speaking_completed_count} of 12 speaking mocks")
                if speaking_started and not speaking_unlocked
                else None
            ),
        )
    )

    accuracy_started = recent_full_mock_count > 0
    accuracy_unlocked = recent_full_mock_count >= 5 and (recent_full_mock_accuracy or 0) >= 90
    catalog.append(
        _catalog_achievement(
            id="performance-accuracy-monster",
            title="Accuracy Monster",
            description="Maintain very high accuracy across recent practice.",
            category="performance",
            rarity="Legendary",
            image="/badges/performance/performance-accuracy-monster.png",
            requirement="Keep 90%+ accuracy across 5 full mocks.",
            status=_catalog_status(unlocked=accuracy_unlocked, started=accuracy_started),
            xp_reward=700,
            progress=(
                _catalog_progress(
                    min(recent_full_mock_count, 5),
                    5,
                    f"{recent_full_mock_count} of 5 mocks • {(recent_full_mock_accuracy or 0):.0f}% avg accuracy",
                )
                if accuracy_started and not accuracy_unlocked
                else None
            ),
        )
    )

    for id, title, description, rarity, threshold, reward in [
        ("performance-mock-warrior", "Mock Warrior", "A serious mock test finisher with strong consistency.", "Rare", 10, 250),
        ("performance-mock-addict", "Mock Addict", "You keep returning for more exam simulation.", "Epic", 50, 600),
    ]:
        unlocked = full_mock_completions >= threshold
        started = full_mock_completions > 0
        catalog.append(
            _catalog_achievement(
                id=id,
                title=title,
                description=description,
                category="performance",
                rarity=rarity,
                image="/badges/special/special-mock-warrior.png" if threshold == 10 else "/badges/special/special-mock-addict.png",
                requirement=f"Complete {threshold} mock tests.",
                status=_catalog_status(unlocked=unlocked, started=started),
                xp_reward=reward,
                progress=(
                    _catalog_progress(min(full_mock_completions, threshold), threshold, f"{full_mock_completions} of {threshold} mocks")
                    if started and not unlocked
                    else None
                ),
            )
        )

    early_supporter_unlocked = bool(user.created_at and user.created_at.date().isoformat() <= "2026-05-01")
    catalog.append(
        _catalog_achievement(
            id="special-early-supporter",
            title="Early Supporter",
            description="You were here before the crowd arrived.",
            category="special",
            rarity="Legendary",
            image="/badges/special/special-early-supporter.png",
            requirement="Join PrimeScore before May 1, 2026.",
            status=_catalog_status(unlocked=early_supporter_unlocked, started=early_supporter_unlocked),
            xp_reward=400,
        )
    )

    weekly_top_10_unlocked = weekly_rank is not None and 0 < weekly_rank <= 10
    weekly_rank_started = weekly_rank is not None and weekly_rank > 0
    catalog.append(
        _catalog_achievement(
            id="special-weekly-top-10",
            title="Weekly Top 10",
            description="Finish the week among the strongest learners.",
            category="special",
            rarity="Epic",
            image="/badges/special/special-weekly-top-10.png",
            requirement="Finish inside the weekly Top 10.",
            status=_catalog_status(unlocked=weekly_top_10_unlocked, started=weekly_rank_started),
            xp_reward=500,
            progress=(
                _catalog_progress(max(0, 11 - int(weekly_rank or 0)), 10, f"Current weekly rank #{weekly_rank}")
                if weekly_rank_started and not weekly_top_10_unlocked
                else None
            ),
        )
    )

    rank_one_unlocked = rank == 1
    rank_started = rank > 0
    catalog.append(
        _catalog_achievement(
            id="special-rank-1",
            title="Rank #1",
            description="The highest spot on the leaderboard is yours.",
            category="special",
            rarity="Mythic",
            image="/badges/special/special-rank-1.png",
            requirement="Reach rank #1 on the leaderboard.",
            status=_catalog_status(unlocked=rank_one_unlocked, started=rank_started),
            xp_reward=1_000,
            progress=(
                _catalog_progress(1 if rank_one_unlocked else 0, 1, f"Current rank #{rank}")
                if rank_started and not rank_one_unlocked
                else None
            ),
        )
    )

    top_one_percent_unlocked = rank > 0 and leaderboard_size > 0 and rank <= top_one_percent_cutoff
    catalog.append(
        _catalog_achievement(
            id="special-top-1",
            title="Top 1%",
            description="Stay among the sharpest performers on the board.",
            category="special",
            rarity="Mythic",
            image="/badges/special/special-top-1.png",
            requirement="Reach the top 1% of the leaderboard.",
            status=_catalog_status(unlocked=top_one_percent_unlocked, started=rank_started),
            xp_reward=1_200,
            progress=(
                _catalog_progress(max(0, top_one_percent_cutoff - rank + 1), top_one_percent_cutoff, f"Current rank #{rank} • target top {top_one_percent_cutoff}")
                if rank_started and not top_one_percent_unlocked and leaderboard_size > 0
                else None
            ),
        )
    )

    for id, title, description, rarity, threshold, reward in [
        ("special-xp-hunter", "XP Hunter", "A strong XP pace is taking shape.", "Rare", 2_000, 180),
        ("special-xp-machine", "XP Machine", "Your XP output is now serious.", "Legendary", 10_000, 900),
    ]:
        unlocked = total_xp >= threshold
        started = total_xp > 0
        catalog.append(
            _catalog_achievement(
                id=id,
                title=title,
                description=description,
                category="special",
                rarity=rarity,
                image="/badges/special/special-xp-hunter.png" if threshold == 2_000 else "/badges/special/special-xp-machine.png",
                requirement=f"Earn {threshold:,} XP.",
                status=_catalog_status(unlocked=unlocked, started=started),
                xp_reward=reward,
                progress=(
                    _catalog_progress(min(total_xp, threshold), threshold, f"{total_xp:,} of {threshold:,} XP")
                    if started and not unlocked
                    else None
                ),
            )
        )

    for id, title, description, threshold, reward, image in [
        ("special-weekend-grinder", "Weekend Grinder", "You still train when most people pause.", 2, 120, "/badges/special/special-weekend-grinder.png"),
        ("special-early-bird", "Early Bird", "You do the work before the day gets noisy.", 10, 140, "/badges/special/special-early-bird.png"),
        ("special-night-owl", "Night Owl", "Late sessions are still moving your score forward.", 10, 140, "/badges/special/special-night-owl.png"),
    ]:
        current = weekend_day_count if id == "special-weekend-grinder" else early_session_count if id == "special-early-bird" else late_session_count
        unlocked = current >= threshold
        started = current > 0
        label = (
            f"{current} of {threshold} weekend days" if id == "special-weekend-grinder" else
            f"{current} of {threshold} early sessions" if id == "special-early-bird" else
            f"{current} of {threshold} late sessions"
        )
        catalog.append(
            _catalog_achievement(
                id=id,
                title=title,
                description=description,
                category="special",
                rarity="Common",
                image=image,
                requirement=(
                    "Practice on 2 different weekend days." if id == "special-weekend-grinder" else
                    "Finish 10 sessions before 08:00 UTC." if id == "special-early-bird" else
                    "Finish 10 sessions after 22:00 UTC."
                ),
                status=_catalog_status(unlocked=unlocked, started=started),
                xp_reward=reward,
                progress=_catalog_progress(min(current, threshold), threshold, label) if started and not unlocked else None,
            )
        )

    return catalog


def _unlocked_achievements_from_catalog(
    catalog: list[LeaderboardUserAchievementStateRead],
) -> list[LeaderboardUserAchievementRead]:
    return [
        LeaderboardUserAchievementRead(
            id=achievement.id,
            title=achievement.title,
            rarity=achievement.rarity,
            image=achievement.image,
        )
        for achievement in catalog
        if achievement.status == "unlocked"
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
            fallback_rank = len(sorted_rows) + 1
            period_xp = (
                int(user.total_xp or 0)
                if internal_period == PERIOD_ALL_TIME
                else await get_user_period_xp(session, user_id=user.id, period_type=internal_period)
            )
            current_user_entry = LeaderboardEntryRead(
                rank=fallback_rank,
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
    writing_submissions = list(
        (
            await session.scalars(
                select(WritingSubmission)
                .where(WritingSubmission.user_id == user.id)
                .order_by(WritingSubmission.submitted_at.desc(), WritingSubmission.created_at.desc())
            )
        ).all()
    )
    writing_submission_ids = [submission.id for submission in writing_submissions]
    writing_evaluations = list(
        (
            await session.scalars(
                select(WritingEvaluation)
                .where(WritingEvaluation.submission_id.in_(writing_submission_ids))
            )
        ).all()
    ) if writing_submission_ids else []
    speaking_sessions = list(
        (
            await session.scalars(
                select(SpeakingSession)
                .where(SpeakingSession.user_id == user.id, SpeakingSession.graded_at.is_not(None))
                .order_by(SpeakingSession.graded_at.desc().nullslast(), SpeakingSession.created_at.desc())
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
    reading_attempts = [attempt for attempt in attempts if _attempt_type(attempt) == "reading"]
    listening_attempts = [attempt for attempt in attempts if _attempt_type(attempt) == "listening"]
    reading_accuracies = [accuracy for attempt in reading_attempts if (accuracy := _attempt_accuracy(attempt)) is not None]
    reading_average_accuracy = round(sum(reading_accuracies) / len(reading_accuracies), 1) if reading_accuracies else None
    listening_perfect_score_reached = any(
        attempt.raw_score is not None
        and int(attempt.max_score or 0) >= 40
        and int(attempt.raw_score or 0) >= int(attempt.max_score or 0)
        for attempt in listening_attempts
    )
    listening_best_score = max((int(attempt.raw_score or 0) for attempt in listening_attempts if attempt.raw_score is not None), default=0)
    listening_best_target = max((int(attempt.max_score or 0) for attempt in listening_attempts), default=40 if listening_best_score > 0 else 0)
    writing_best_band = max((float(evaluation.overall_band or 0) for evaluation in writing_evaluations), default=0.0) or None
    full_mock_accuracies = [
        accuracy
        for attempt in attempts
        if attempt.scope == AttemptScope.FULL or bool((attempt.attempt_metadata or {}).get("is_full_mock"))
        if (accuracy := _attempt_accuracy(attempt)) is not None
    ]
    recent_full_mock_accuracies = full_mock_accuracies[-5:]
    recent_full_mock_accuracy = (
        round(sum(recent_full_mock_accuracies) / len(recent_full_mock_accuracies), 1)
        if recent_full_mock_accuracies
        else None
    )
    activity_timestamps = [
        attempt.created_at
        for attempt in attempts
        if attempt.created_at is not None
    ] + [
        submission.submitted_at
        for submission in writing_submissions
        if submission.submitted_at is not None
    ] + [
        speaking_session.graded_at
        for speaking_session in speaking_sessions
        if speaking_session.graded_at is not None
    ]
    weekend_day_count = len({timestamp.date() for timestamp in activity_timestamps if timestamp.weekday() in {5, 6}})
    early_session_count = sum(1 for timestamp in activity_timestamps if timestamp.astimezone(UTC).hour < 8)
    late_session_count = sum(1 for timestamp in activity_timestamps if timestamp.astimezone(UTC).hour >= 22)

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
    achievement_catalog = _build_achievement_catalog(
        user=user,
        reading_attempt_count=len(reading_attempts),
        reading_average_accuracy=reading_average_accuracy,
        listening_perfect_score_reached=listening_perfect_score_reached,
        listening_best_score=listening_best_score,
        listening_best_target=listening_best_target,
        writing_submission_count=len(writing_submissions),
        writing_best_band=writing_best_band,
        speaking_completed_count=len(speaking_sessions),
        recent_full_mock_accuracy=recent_full_mock_accuracy,
        recent_full_mock_count=len(recent_full_mock_accuracies),
        full_mock_completions=total_mock_tests,
        weekend_day_count=weekend_day_count,
        early_session_count=early_session_count,
        late_session_count=late_session_count,
        rank=rank,
        weekly_rank=weekly_rank,
        leaderboard_size=leaderboard_size,
    )
    achievements = _unlocked_achievements_from_catalog(achievement_catalog)

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
        achievement_catalog=achievement_catalog,
    )
