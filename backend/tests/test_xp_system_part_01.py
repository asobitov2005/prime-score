from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from tests.test_xp_system_dependencies import *

USER_ID = UUID("11111111-1111-1111-1111-111111111111")

OTHER_USER_ID = UUID("22222222-2222-2222-2222-222222222222")

def _debug_user() -> DebugPrincipal:
    return DebugPrincipal(
        id=USER_ID,
        first_name="Prime",
        last_name="User",
        username="prime_user",
        phone="+998901112233",
        role="user",
        is_premium=True,
        show_on_leaderboard=True,
    )

def test_calculate_xp_for_activity_applies_quality_and_repeat_rules() -> None:
    result = xp.calculate_xp_for_activity(
        xp.XPActivity(
            user_id=USER_ID,
            activity_type="attempt",
            source_type="attempt",
            source_id="attempt-1",
            skill_key="reading",
            test_type="reading",
            score=6.5,
            accuracy=82.0,
            repeat_ordinal=1,
            previous_score=6.0,
            previous_accuracy=70.0,
            improvement_bonus_allowed=True,
            streak_bonus=25,
        )
    )

    assert result.breakdown == {
        "activity_xp": 80,
        "score_bonus": 25,
        "accuracy_bonus": 50,
        "improvement_bonus": 40,
        "streak_bonus": 25,
        "repeat_multiplier": 1.0,
        "cap_applied": False,
        "content_eligible": True,
        "flagged": False,
        "total": 220,
    }
    assert result.total_xp == 220

def test_calculate_xp_for_activity_zeroes_repeat_bonus_after_fourth_attempt() -> None:
    result = xp.calculate_xp_for_activity(
        xp.XPActivity(
            user_id=USER_ID,
            activity_type="attempt",
            source_type="attempt",
            source_id="attempt-4",
            skill_key="listening",
            test_type="listening",
            score=7.0,
            accuracy=91.0,
            repeat_ordinal=4,
            previous_accuracy=70.0,
            improvement_bonus_allowed=True,
            streak_bonus=25,
        )
    )

    assert result.breakdown["activity_xp"] == 0
    assert result.breakdown["score_bonus"] == 0
    assert result.breakdown["accuracy_bonus"] == 0
    assert result.breakdown["improvement_bonus"] == 0
    assert result.breakdown["streak_bonus"] == 25
    assert result.total_xp == 25

def test_score_from_attempt_uses_unscaled_40_question_band_when_band_missing() -> None:
    attempt = SimpleNamespace(
        band_score=None,
        raw_score=9,
        test_type="reading",
    )

    assert xp._score_from_attempt(attempt) == 3.5

def test_score_from_attempt_ignores_stored_section_band() -> None:
    attempt = SimpleNamespace(
        band_score=8.0,
        raw_score=9,
        test_type="reading",
        scope="section",
    )

    assert xp._score_from_attempt(attempt) == 3.5

def test_level_formula_matches_examples() -> None:
    assert xp.calculate_level(0) == 1
    assert xp.calculate_level(100) == 2
    assert xp.calculate_level(400) == 3
    assert xp.calculate_level(900) == 4
    assert xp.calculate_level(2500) == 6
    assert xp.calculate_level(10000) == 11

def test_achievement_catalog_keeps_higher_level_badges_locked_for_level_one_user() -> None:
    user = SimpleNamespace(
        current_level=1,
        total_xp=0,
        current_streak=0,
        best_streak=0,
        created_at=datetime(2026, 5, 10, tzinfo=UTC),
    )

    catalog = leaderboard_route._build_achievement_catalog(
        user=user,
        reading_attempt_count=0,
        reading_average_accuracy=None,
        listening_perfect_score_reached=False,
        listening_best_score=0,
        listening_best_target=0,
        writing_submission_count=0,
        writing_best_band=None,
        speaking_completed_count=0,
        recent_full_mock_accuracy=None,
        recent_full_mock_count=0,
        full_mock_completions=0,
        weekend_day_count=0,
        early_session_count=0,
        late_session_count=0,
        rank=0,
        weekly_rank=None,
        leaderboard_size=0,
    )

    bronze = next(item for item in catalog if item.id == "level-bronze-learner")
    silver = next(item for item in catalog if item.id == "level-silver-scholar")

    assert bronze.status == "locked"
    assert silver.status == "locked"

def test_achievement_catalog_requires_both_level_and_xp_for_level_badges() -> None:
    user = SimpleNamespace(
        current_level=10,
        total_xp=1_950,
        current_streak=0,
        best_streak=0,
        created_at=datetime(2026, 5, 10, tzinfo=UTC),
    )

    catalog = leaderboard_route._build_achievement_catalog(
        user=user,
        reading_attempt_count=0,
        reading_average_accuracy=None,
        listening_perfect_score_reached=False,
        listening_best_score=0,
        listening_best_target=0,
        writing_submission_count=0,
        writing_best_band=None,
        speaking_completed_count=0,
        recent_full_mock_accuracy=None,
        recent_full_mock_count=0,
        full_mock_completions=0,
        weekend_day_count=0,
        early_session_count=0,
        late_session_count=0,
        rank=0,
        weekly_rank=None,
        leaderboard_size=0,
    )

    silver = next(item for item in catalog if item.id == "level-silver-scholar")

    assert silver.status == "in_progress"
    assert silver.progress is not None
    assert "Level 10 / 10" in silver.progress.label
    assert "1,950 / 2,000 XP" in silver.progress.label

async def test_create_xp_transaction_applies_daily_cap(monkeypatch) -> None:
    added: list[object] = []
    user = SimpleNamespace(total_xp=650, current_level=3)

    class _FakeSession:
        async def execute(self, _statement: object):
            return SimpleNamespace(scalar_one_or_none=lambda: None)

        def add(self, item: object) -> None:
            added.append(item)

        async def flush(self) -> None:
            return None

    async def fake_daily_cap_limit(*args, **kwargs) -> int:
        return 700

    async def fake_daily_cap_consumed(*args, **kwargs) -> int:
        return 690

    async def fake_ensure_user(*args, **kwargs):
        return user

    async def fake_update_leaderboard_cache(*args, **kwargs) -> None:
        return None

    monkeypatch.setattr(xp, "_daily_cap_limit", fake_daily_cap_limit)
    monkeypatch.setattr(xp, "_daily_cap_consumed", fake_daily_cap_consumed)
    monkeypatch.setattr(xp, "_ensure_user", fake_ensure_user)
    monkeypatch.setattr(xp, "_update_leaderboard_cache", fake_update_leaderboard_cache)

    transaction = await xp.create_xp_transaction(
        _FakeSession(),
        user_id=USER_ID,
        transaction_type=xp.TX_SCORE_BONUS,
        amount=50,
        source_type="attempt",
        source_id="attempt-1",
        metadata={"activity_label": "Reading Test"},
        occurred_at=datetime(2026, 5, 17, 9, 0, tzinfo=UTC),
    )

    assert transaction.xp_amount == 10
    assert user.total_xp == 660
    assert user.current_level == xp.calculate_level(660)
    assert added
