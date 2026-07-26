from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.leaderboard_dependencies import *

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

async def _table_exists(session: AsyncSession, table_name: str) -> bool:
    value = await session.scalar(select(func.to_regclass(table_name)))
    return value is not None

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
    weekly_leaderboard_size: int = 0,
) -> list[LeaderboardUserAchievementStateRead]:
    context = AchievementCatalogContext(
        user=user,
        reading_attempt_count=reading_attempt_count,
        reading_average_accuracy=reading_average_accuracy,
        listening_perfect_score_reached=listening_perfect_score_reached,
        listening_best_score=listening_best_score,
        listening_best_target=listening_best_target,
        writing_submission_count=writing_submission_count,
        writing_best_band=writing_best_band,
        speaking_completed_count=speaking_completed_count,
        recent_full_mock_accuracy=recent_full_mock_accuracy,
        recent_full_mock_count=recent_full_mock_count,
        full_mock_completions=full_mock_completions,
        weekend_day_count=weekend_day_count,
        early_session_count=early_session_count,
        late_session_count=late_session_count,
        rank=rank,
        weekly_rank=weekly_rank,
        leaderboard_size=leaderboard_size,
        weekly_leaderboard_size=weekly_leaderboard_size,
    )
    return build_achievement_catalog(context)


def _achievement_badge_index() -> dict[str, tuple[str, str | None]]:
    """Static ``{achievement_id: (title, image)}`` for every badge in the catalog."""
    from types import SimpleNamespace

    dummy = SimpleNamespace(
        id="00000000-0000-0000-0000-000000000000",
        current_level=999,
        total_xp=10**9,
        current_streak=99999,
        best_streak=99999,
        created_at=datetime(2000, 1, 1, tzinfo=UTC),
    )
    catalog = _build_achievement_catalog(
        user=dummy,  # type: ignore[arg-type]
        reading_attempt_count=10**6,
        reading_average_accuracy=100.0,
        listening_perfect_score_reached=True,
        listening_best_score=40,
        listening_best_target=40,
        writing_submission_count=10**6,
        writing_best_band=9.0,
        speaking_completed_count=10**6,
        recent_full_mock_accuracy=100.0,
        recent_full_mock_count=10**6,
        full_mock_completions=10**6,
        weekend_day_count=10**6,
        early_session_count=10**6,
        late_session_count=10**6,
        rank=1,
        weekly_rank=1,
        leaderboard_size=10**6,
        weekly_leaderboard_size=10**6,
    )
    return {item.id: (item.title, item.image) for item in catalog}


def _resolve_leaderboard_badge(
    *,
    equipped_achievement_id: str | None,
    unlocked: list[tuple[str, datetime]],
    level: int,
    current_streak: int,
    full_mock_completions: int,
) -> tuple[str | None, str | None]:
    index = _achievement_badge_index()
    unlocked_ids = {aid for aid, _ in unlocked}

    chosen_id: str | None = None
    if equipped_achievement_id and equipped_achievement_id in unlocked_ids:
        chosen_id = equipped_achievement_id
    elif unlocked:
        chosen_id = max(unlocked, key=lambda item: item[1])[0]

    if chosen_id and chosen_id in index:
        return index[chosen_id]

    milestone = badge_for_user(
        level=level,
        current_streak=current_streak,
        full_mock_completions=full_mock_completions,
    )
    return (milestone, _badge_image(milestone)) if milestone else (None, None)


async def _unlocked_badges_by_user(
    session: AsyncSession, user_ids: list[UUID]
) -> dict[UUID, list[tuple[str, datetime]]]:
    if not user_ids:
        return {}
    rows = (
        await session.execute(
            select(
                UserAchievement.user_id,
                UserAchievement.achievement_id,
                UserAchievement.unlocked_at,
            ).where(UserAchievement.user_id.in_(user_ids))
        )
    ).all()
    result: dict[UUID, list[tuple[str, datetime]]] = {}
    for user_id, achievement_id, unlocked_at in rows:
        result.setdefault(user_id, []).append((achievement_id, unlocked_at))
    return result

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
