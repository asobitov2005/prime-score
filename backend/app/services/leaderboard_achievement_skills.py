from __future__ import annotations

from app.schemas.leaderboard import LeaderboardUserAchievementStateRead
from app.services.leaderboard_achievement_common import (
    AchievementCatalogContext,
    achievement,
    achievement_progress,
    achievement_status,
)


def build_skill_achievements(
    context: AchievementCatalogContext,
) -> list[LeaderboardUserAchievementStateRead]:
    return [
        _reading(context),
        _listening(context),
        _writing(context),
        _speaking(context),
    ]


def _reading(context: AchievementCatalogContext) -> LeaderboardUserAchievementStateRead:
    unlocked = (
        context.reading_attempt_count >= 20
        and (context.reading_average_accuracy or 0) >= 75
    )
    started = context.reading_attempt_count > 0
    return achievement(
        id="skill-reading-beast",
        title="Reading Beast",
        description="Show strong command of IELTS Reading practice.",
        category="skill",
        skill_type="reading",
        rarity="Epic",
        image="/badges/skill/reading.png",
        requirement="Complete 20 Reading tests with 75%+ average accuracy.",
        status=achievement_status(unlocked=unlocked, started=started),
        xp_reward=360,
        progress=(
            achievement_progress(
                min(context.reading_attempt_count, 20),
                20,
                f"{context.reading_attempt_count} of 20 tests • "
                f"{(context.reading_average_accuracy or 0):.0f}% avg accuracy",
            )
            if started and not unlocked
            else None
        ),
    )


def _listening(context: AchievementCatalogContext) -> LeaderboardUserAchievementStateRead:
    started = context.listening_best_target > 0 or context.listening_best_score > 0
    return achievement(
        id="skill-perfect-listening",
        title="Perfect Listening",
        description="Develop exam-ready listening accuracy.",
        category="skill",
        skill_type="listening",
        rarity="Legendary",
        image="/badges/skill/listening.png",
        requirement="Score 40/40 on a Listening mock.",
        status=achievement_status(
            unlocked=context.listening_perfect_score_reached,
            started=started,
        ),
        xp_reward=600,
        progress=(
            achievement_progress(
                context.listening_best_score,
                context.listening_best_target,
                f"Best score: {context.listening_best_score} / "
                f"{context.listening_best_target}",
            )
            if (
                started
                and not context.listening_perfect_score_reached
                and context.listening_best_target > 0
            )
            else None
        ),
    )


def _writing(context: AchievementCatalogContext) -> LeaderboardUserAchievementStateRead:
    started = context.writing_submission_count > 0
    unlocked = (
        context.writing_submission_count >= 10
        and (context.writing_best_band or 0) >= 7
    )
    return achievement(
        id="skill-writing-excellence",
        title="Writing Excellence",
        description="Produce high-quality writing with clear improvement.",
        category="skill",
        skill_type="writing",
        rarity="Rare",
        image="/badges/skill/writing.png",
        requirement="Submit 10 Writing tasks and reach Band 7.0.",
        status=achievement_status(unlocked=unlocked, started=started),
        xp_reward=300,
        progress=(
            achievement_progress(
                min(context.writing_submission_count, 10),
                10,
                f"{context.writing_submission_count} of 10 submissions • "
                f"best band {(context.writing_best_band or 0):.1f}",
            )
            if started and not unlocked
            else None
        ),
    )


def _speaking(context: AchievementCatalogContext) -> LeaderboardUserAchievementStateRead:
    started = context.speaking_completed_count > 0
    unlocked = context.speaking_completed_count >= 12
    return achievement(
        id="skill-speaking-elite",
        title="Speaking Elite",
        description="Build fluent and confident IELTS Speaking responses.",
        category="skill",
        skill_type="speaking",
        rarity="Rare",
        image="/badges/skill/speaking.png",
        requirement="Complete 12 Speaking mocks.",
        status=achievement_status(unlocked=unlocked, started=started),
        xp_reward=320,
        progress=(
            achievement_progress(
                context.speaking_completed_count,
                12,
                f"{context.speaking_completed_count} of 12 speaking mocks",
            )
            if started and not unlocked
            else None
        ),
    )
