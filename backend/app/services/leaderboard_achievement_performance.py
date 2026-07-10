from __future__ import annotations

from app.schemas.leaderboard import LeaderboardUserAchievementStateRead
from app.services.leaderboard_achievement_common import (
    AchievementCatalogContext,
    achievement,
    achievement_progress,
    achievement_status,
)

MOCK_ACHIEVEMENTS = (
    (
        "performance-mock-warrior",
        "Mock Warrior",
        "A serious mock test finisher with strong consistency.",
        "Rare",
        10,
        250,
        "/badges/special/special-mock-warrior.png",
    ),
    (
        "performance-mock-addict",
        "Mock Addict",
        "You keep returning for more exam simulation.",
        "Epic",
        50,
        600,
        "/badges/special/special-mock-addict.png",
    ),
)


def build_performance_achievements(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    items = [_accuracy(context)]
    items.extend(_mock_completions(context))
    return items


def _accuracy(context: AchievementCatalogContext) -> LeaderboardUserAchievementStateRead:
    started = context.recent_full_mock_count > 0
    unlocked = (
        context.recent_full_mock_count >= 5
        and (context.recent_full_mock_accuracy or 0) >= 90
    )
    return achievement(
        id="performance-accuracy-monster",
        title="Accuracy Monster",
        description="Maintain very high accuracy across recent practice.",
        category="performance",
        rarity="Legendary",
        image="/badges/performance/performance-accuracy-monster.png",
        requirement="Keep 90%+ accuracy across 5 full mocks.",
        status=achievement_status(unlocked=unlocked, started=started),
        xp_reward=700,
        progress=(
            achievement_progress(
                min(context.recent_full_mock_count, 5),
                5,
                f"{context.recent_full_mock_count} of 5 mocks • "
                f"{(context.recent_full_mock_accuracy or 0):.0f}% avg accuracy",
            )
            if started and not unlocked
            else None
        ),
    )


def _mock_completions(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    items: list[LeaderboardUserAchievementStateRead] = []
    for id, title, description, rarity, threshold, reward, image in MOCK_ACHIEVEMENTS:
        unlocked = context.full_mock_completions >= threshold
        started = context.full_mock_completions > 0
        items.append(
            achievement(
                id=id,
                title=title,
                description=description,
                category="performance",
                rarity=rarity,
                image=image,
                requirement=f"Complete {threshold} mock tests.",
                status=achievement_status(unlocked=unlocked, started=started),
                xp_reward=reward,
                progress=(
                    achievement_progress(
                        min(context.full_mock_completions, threshold),
                        threshold,
                        f"{context.full_mock_completions} of {threshold} mocks",
                    )
                    if started and not unlocked
                    else None
                ),
            )
        )
    return items
