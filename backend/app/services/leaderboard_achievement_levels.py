from __future__ import annotations

from app.schemas.leaderboard import LeaderboardUserAchievementStateRead
from app.services.leaderboard_achievement_common import (
    AchievementCatalogContext,
    achievement,
    achievement_progress,
    achievement_status,
    streak_image,
    streak_rarity,
)

LEVEL_ACHIEVEMENTS = (
    (
        "level-bronze-learner",
        "Bronze Learner",
        "Your journey begins.",
        "Common",
        "/badges/level/badge-level-bronze-learner.png",
        5,
        500,
        50,
    ),
    (
        "level-silver-scholar",
        "Silver Scholar",
        "Consistency builds greatness.",
        "Rare",
        "/badges/level/badge-level-silver-scholar.png",
        10,
        2_000,
        150,
    ),
    (
        "level-gold-achiever",
        "Gold Achiever",
        "Proof of serious dedication.",
        "Epic",
        "/badges/level/badge-level-gold-achiever.png",
        15,
        5_000,
        350,
    ),
    (
        "level-platinum-master",
        "Platinum Master",
        "Elite discipline unlocked.",
        "Legendary",
        "/badges/level/badge-level-platinum-master.png",
        20,
        10_000,
        750,
    ),
    (
        "level-prime-legend",
        "Prime Legend",
        "Reserved for the truly relentless.",
        "Mythic",
        "/badges/level/badge-level-prime-legend.png",
        30,
        25_000,
        2_000,
    ),
)

STREAK_ACHIEVEMENTS = (
    ("streak-3-day", "Starter Streak", "Three days of focused practice in a row.", 3, 60),
    ("streak-7-warrior", "Warrior", "One full week of IELTS discipline.", 7, 120),
    ("streak-14-consistent", "Consistent Learner", "Consistency is becoming part of your identity.", 14, 220),
    ("streak-30-beast", "Monthly Beast", "A full month of showing up for your IELTS goal.", 30, 420),
    ("streak-60-discipline", "Discipline Master", "Two months of serious preparation rhythm.", 60, 700),
    ("streak-90-unbreakable", "Unbreakable", "A streak that shows rare commitment.", 90, 900),
    ("streak-180-iron-mind", "Iron Mind", "Half a year of relentless exam preparation.", 180, 1_500),
    ("streak-365-prime-legend", "365 Day Prime Legend", "The ultimate yearly consistency achievement.", 365, 3_000),
)


def build_level_achievements(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    started = context.level > 1 or context.total_xp > 0
    items: list[LeaderboardUserAchievementStateRead] = []
    for (
        id,
        title,
        description,
        rarity,
        image,
        required_level,
        required_xp,
        xp_reward,
    ) in LEVEL_ACHIEVEMENTS:
        unlocked = context.level >= required_level and context.total_xp >= required_xp
        items.append(
            achievement(
                id=id,
                title=title,
                description=description,
                category="level",
                rarity=rarity,
                image=image,
                requirement=(
                    f"Reach Level {required_level} and earn {required_xp:,} XP."
                ),
                status=achievement_status(unlocked=unlocked, started=started),
                required_xp=required_xp,
                unlock_level=required_level,
                xp_reward=xp_reward,
                progress=(
                    achievement_progress(
                        context.total_xp,
                        required_xp,
                        f"Level {context.level} / {required_level} • "
                        f"{context.total_xp:,} / {required_xp:,} XP",
                    )
                    if started and not unlocked
                    else None
                ),
            )
        )
    return items


def build_streak_achievements(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    items: list[LeaderboardUserAchievementStateRead] = []
    for id, title, description, days, xp_reward in STREAK_ACHIEVEMENTS:
        unlocked = context.best_streak >= days
        started = context.best_streak > 0
        items.append(
            achievement(
                id=id,
                title=title,
                description=description,
                category="streak",
                rarity=streak_rarity(days),
                image=streak_image(days),
                requirement=f"Practice for {days} consecutive days.",
                status=achievement_status(unlocked=unlocked, started=started),
                streak_days=days,
                xp_reward=xp_reward,
                progress=(
                    achievement_progress(
                        context.best_streak,
                        days,
                        f"{context.best_streak} of {days} days",
                    )
                    if started and not unlocked
                    else None
                ),
            )
        )
    return items
