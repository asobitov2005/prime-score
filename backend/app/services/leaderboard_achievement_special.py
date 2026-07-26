from __future__ import annotations

from app.schemas.leaderboard import LeaderboardUserAchievementStateRead
from app.services.leaderboard_achievement_common import (
    AchievementCatalogContext,
    achievement,
    achievement_progress,
    achievement_status,
)

XP_ACHIEVEMENTS = (
    (
        "special-xp-hunter",
        "XP Hunter",
        "A strong XP pace is taking shape.",
        "Rare",
        2_000,
        180,
        "/badges/special/special-xp-hunter.png",
    ),
    (
        "special-xp-machine",
        "XP Machine",
        "Your XP output is now serious.",
        "Legendary",
        10_000,
        900,
        "/badges/special/special-xp-machine.png",
    ),
)

SESSION_ACHIEVEMENTS = (
    (
        "special-weekend-grinder",
        "Weekend Grinder",
        "You still train when most people pause.",
        2,
        120,
        "/badges/special/special-weekend-grinder.png",
        "Practice on 2 different weekend days.",
        "weekend days",
    ),
    (
        "special-early-bird",
        "Early Bird",
        "You do the work before the day gets noisy.",
        10,
        140,
        "/badges/special/special-early-bird.png",
        "Finish 10 sessions before 08:00 UTC.",
        "early sessions",
    ),
    (
        "special-night-owl",
        "Night Owl",
        "Late sessions are still moving your score forward.",
        10,
        140,
        "/badges/special/special-night-owl.png",
        "Finish 10 sessions after 22:00 UTC.",
        "late sessions",
    ),
)


def build_special_achievements(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    items = [
        _early_supporter(context),
        _weekly_top_ten(context),
        _rank_one(context),
        _top_one_percent(context),
    ]
    items.extend(_xp_items(context))
    items.extend(_session_items(context))
    return items


def _early_supporter(
    context: AchievementCatalogContext,
) -> LeaderboardUserAchievementStateRead:
    unlocked = bool(
        context.user.created_at
        and context.user.created_at.date().isoformat() <= "2026-05-01"
    )
    return achievement(
        id="special-early-supporter",
        title="Early Supporter",
        description="You were here before the crowd arrived.",
        category="special",
        rarity="Legendary",
        image="/badges/special/special-early-supporter.png",
        requirement="Join PrimeScore before May 1, 2026.",
        status=achievement_status(unlocked=unlocked, started=unlocked),
        xp_reward=400,
    )


def _weekly_top_ten(
    context: AchievementCatalogContext,
) -> LeaderboardUserAchievementStateRead:
    from app.services.leaderboard_achievement_common import (
        MIN_RANKED_FOR_WEEKLY_TOP_10,
        composite_progress,
    )

    unlocked = (
        context.weekly_rank is not None
        and 0 < context.weekly_rank <= 10
        and context.weekly_leaderboard_size >= MIN_RANKED_FOR_WEEKLY_TOP_10
    )
    started = context.weekly_rank is not None and context.weekly_rank > 0
    weekly_rank = int(context.weekly_rank or 0)
    return achievement(
        id="special-weekly-top-10",
        title="Weekly Top 10",
        description="Finish the week among the strongest learners.",
        category="special",
        rarity="Epic",
        image="/badges/special/special-weekly-top-10.png",
        requirement="Finish inside the weekly Top 10.",
        status=achievement_status(unlocked=unlocked, started=started),
        xp_reward=500,
        progress=(
            composite_progress(
                fractions=[
                    context.weekly_leaderboard_size / MIN_RANKED_FOR_WEEKLY_TOP_10,
                    (10 / weekly_rank) if weekly_rank else 0.0,
                ],
                label=(
                    f"Weekly rank #{weekly_rank} • top 10 of "
                    f"{MIN_RANKED_FOR_WEEKLY_TOP_10}+ competitors"
                ),
            )
            if started and not unlocked
            else None
        ),
    )


def _rank_one(context: AchievementCatalogContext) -> LeaderboardUserAchievementStateRead:
    from app.services.leaderboard_achievement_common import (
        MIN_RANKED_FOR_RANK_ONE,
        composite_progress,
    )

    unlocked = context.rank == 1 and context.leaderboard_size >= MIN_RANKED_FOR_RANK_ONE
    started = context.rank > 0
    return achievement(
        id="special-rank-1",
        title="Rank #1",
        description="The highest spot on the leaderboard is yours.",
        category="special",
        rarity="Mythic",
        image="/badges/special/special-rank-1.png",
        requirement="Reach rank #1 on the leaderboard.",
        status=achievement_status(unlocked=unlocked, started=started),
        xp_reward=1_000,
        progress=(
            composite_progress(
                fractions=[
                    context.leaderboard_size / MIN_RANKED_FOR_RANK_ONE,
                    1.0 if context.rank == 1 else (1.0 / context.rank if context.rank > 0 else 0.0),
                ],
                label=f"Rank #{context.rank} of {context.leaderboard_size}",
            )
            if started and not unlocked
            else None
        ),
    )


def _top_one_percent(
    context: AchievementCatalogContext,
) -> LeaderboardUserAchievementStateRead:
    from app.services.leaderboard_achievement_common import (
        MIN_RANKED_FOR_TOP_ONE_PERCENT,
        composite_progress,
    )

    started = context.rank > 0
    unlocked = (
        started
        and context.leaderboard_size >= MIN_RANKED_FOR_TOP_ONE_PERCENT
        and context.rank <= context.top_one_percent_cutoff
    )
    return achievement(
        id="special-top-1",
        title="Top 1%",
        description="Stay among the sharpest performers on the board.",
        category="special",
        rarity="Mythic",
        image="/badges/special/special-top-1.png",
        requirement="Reach the top 1% of the leaderboard.",
        status=achievement_status(unlocked=unlocked, started=started),
        xp_reward=1_200,
        progress=(
            composite_progress(
                fractions=[
                    context.leaderboard_size / MIN_RANKED_FOR_TOP_ONE_PERCENT,
                    (context.top_one_percent_cutoff / context.rank) if context.rank > 0 else 0.0,
                ],
                label=(
                    f"Rank #{context.rank} • top 1% of "
                    f"{MIN_RANKED_FOR_TOP_ONE_PERCENT}+ competitors"
                ),
            )
            if started and not unlocked
            else None
        ),
    )


def _xp_items(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    items: list[LeaderboardUserAchievementStateRead] = []
    for id, title, description, rarity, threshold, reward, image in XP_ACHIEVEMENTS:
        unlocked = context.total_xp >= threshold
        started = context.total_xp > 0
        items.append(
            achievement(
                id=id,
                title=title,
                description=description,
                category="special",
                rarity=rarity,
                image=image,
                requirement=f"Earn {threshold:,} XP.",
                status=achievement_status(unlocked=unlocked, started=started),
                xp_reward=reward,
                progress=(
                    achievement_progress(
                        min(context.total_xp, threshold),
                        threshold,
                        f"{context.total_xp:,} of {threshold:,} XP",
                    )
                    if started and not unlocked
                    else None
                ),
            )
        )
    return items


def _session_items(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    counts = {
        "special-weekend-grinder": context.weekend_day_count,
        "special-early-bird": context.early_session_count,
        "special-night-owl": context.late_session_count,
    }
    items: list[LeaderboardUserAchievementStateRead] = []
    for (
        id,
        title,
        description,
        threshold,
        reward,
        image,
        requirement,
        label_suffix,
    ) in SESSION_ACHIEVEMENTS:
        current = counts[id]
        unlocked = current >= threshold
        started = current > 0
        items.append(
            achievement(
                id=id,
                title=title,
                description=description,
                category="special",
                rarity="Common",
                image=image,
                requirement=requirement,
                status=achievement_status(unlocked=unlocked, started=started),
                xp_reward=reward,
                progress=(
                    achievement_progress(
                        min(current, threshold),
                        threshold,
                        f"{current} of {threshold} {label_suffix}",
                    )
                    if started and not unlocked
                    else None
                ),
            )
        )
    return items
