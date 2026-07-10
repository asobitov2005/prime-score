from app.models.user import User
from app.services.admin_example_reading_seed import (
    ADMIN_EXAMPLE_READING_TEST_ID,
    build_admin_example_reading_draft,
)
from app.services.leaderboard_achievement_catalog import build_achievement_catalog
from app.services.leaderboard_achievement_common import AchievementCatalogContext

EXPECTED_ACHIEVEMENT_IDS = [
    "level-bronze-learner",
    "level-silver-scholar",
    "level-gold-achiever",
    "level-platinum-master",
    "level-prime-legend",
    "streak-3-day",
    "streak-7-warrior",
    "streak-14-consistent",
    "streak-30-beast",
    "streak-60-discipline",
    "streak-90-unbreakable",
    "streak-180-iron-mind",
    "streak-365-prime-legend",
    "skill-reading-beast",
    "skill-perfect-listening",
    "skill-writing-excellence",
    "skill-speaking-elite",
    "performance-accuracy-monster",
    "performance-mock-warrior",
    "performance-mock-addict",
    "special-early-supporter",
    "special-weekly-top-10",
    "special-rank-1",
    "special-top-1",
    "special-xp-hunter",
    "special-xp-machine",
    "special-weekend-grinder",
    "special-early-bird",
    "special-night-owl",
]


def test_achievement_catalog_keeps_order_and_contract() -> None:
    user = User(
        telegram_id=123456789,
        phone="+998901234567",
        first_name="Prime",
        total_xp=2_500,
        current_level=12,
        current_streak=8,
        best_streak=14,
    )
    context = AchievementCatalogContext(
        user=user,
        reading_attempt_count=4,
        reading_average_accuracy=72.0,
        listening_perfect_score_reached=False,
        listening_best_score=34,
        listening_best_target=40,
        writing_submission_count=3,
        writing_best_band=6.5,
        speaking_completed_count=2,
        recent_full_mock_accuracy=84.0,
        recent_full_mock_count=2,
        full_mock_completions=6,
        weekend_day_count=1,
        early_session_count=4,
        late_session_count=2,
        rank=25,
        weekly_rank=12,
        leaderboard_size=1_000,
    )

    catalog = build_achievement_catalog(context)

    assert [item.id for item in catalog] == EXPECTED_ACHIEVEMENT_IDS
    assert len(catalog) == 29
    assert all(item.status in {"locked", "in_progress", "unlocked"} for item in catalog)
    assert next(item for item in catalog if item.id == "level-silver-scholar").status == "unlocked"
    assert next(item for item in catalog if item.id == "streak-14-consistent").status == "unlocked"


def test_example_reading_draft_keeps_content_contract() -> None:
    draft = build_admin_example_reading_draft()
    sections = draft["content"]["sections"]
    groups = draft["questionGroups"]
    questions = draft["questions"]

    assert draft["metadata"]["id"] == ADMIN_EXAMPLE_READING_TEST_ID
    assert len(sections) == 3
    assert [section["marker_count"] for section in sections] == [13, 13, 14]
    assert len(questions) == 40
    assert sum(len(group["questions"]) for group in groups) == 40
    assert [question["label"] for question in questions] == [str(number) for number in range(1, 41)]
    assert sections[0]["title"] == "Harvesting Water from Fog"
    assert sections[2]["title"] == "The City That Mapped Shade"
