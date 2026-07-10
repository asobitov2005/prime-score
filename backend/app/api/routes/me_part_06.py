from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *
from app.api.routes.me_part_04 import _leaderboard_rank_for_user, _serialize_xp_transaction, _user_xp_summary
from app.api.routes.me_part_05 import _attempt_scope_value, _load_attempts

router = APIRouter()

def _effective_attempt_band_score(attempt) -> Decimal | float | None:
    snapshot = attempt.test_snapshot if isinstance(attempt.test_snapshot, dict) else {}
    test_type = TestType(str(snapshot.get("test_type", TestType.reading)))
    if attempt.band_score is not None and (
        _attempt_scope_value(attempt) == TestScope.full.value
        or test_type in {TestType.writing, TestType.speaking}
    ):
        return attempt.band_score
    if attempt.raw_score is None:
        return None
    if test_type == TestType.speaking:
        return None

    return band_for_raw_score(test_type, int(attempt.raw_score))

async def _load_writing_attempts(current_user: DebugPrincipal, session: AsyncSession):
    from app.models.writing import WritingSubmission, WritingEvaluation, WritingTask
    from app.models.enums import WritingSubmissionStatus
    from app.core.enums import AttemptStatus

    rows = (await session.execute(
        select(WritingSubmission, WritingEvaluation, WritingTask)
        .outerjoin(WritingEvaluation, WritingEvaluation.submission_id == WritingSubmission.id)
        .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
        .where(WritingSubmission.user_id == current_user.id)
    )).all()

    adapters = []
    for sub, ev, task in rows:
        status = AttemptStatus.completed if sub.status == WritingSubmissionStatus.COMPLETED else AttemptStatus.in_progress
        section_number = 1 if sub.task_type.value == "task_1" else 2

        snapshot = {
            "test_type": "writing",
            "scope": "section",
            "format": f"section_{section_number}",
            "sections": [{"section_number": section_number}],
            "title": task.title,
        }

        band_score = ev.overall_band if ev else None

        metadata = {
            "writing_criteria": {
                "task_achievement": ev.task_achievement_band if ev else None,
                "coherence_cohesion": ev.coherence_band if ev else None,
                "lexical_resource": ev.lexical_band if ev else None,
                "grammatical_range_accuracy": ev.grammar_band if ev else None,
            }
        }

        adapters.append(AttemptRuntime(
            attempt_id=sub.id,
            user_id=sub.user_id,
            test_id=task.id,
            test_version=1,
            scope=TestScope.section,
            section_id=None,
            mode=TestMode.practice, # Writing is generally practice for now
            status=status,
            started_at=sub.submitted_at,
            completed_at=sub.submitted_at,
            time_spent_sec=sub.time_spent_seconds,
            raw_score=None,
            total_questions=0,
            band_score=Decimal(str(band_score)) if band_score is not None else None,
            test_snapshot=snapshot,
            metadata=metadata,
            scoring_items=[]
        ))

    return adapters

def _speaking_entry_mode_parts(entry_mode: str) -> list[int]:
    if entry_mode == "full":
        return [1, 2, 3]
    match = re.search(r"part_(\d)", entry_mode)
    if not match:
        return [1]
    return [max(1, min(3, int(match.group(1))))]

async def _load_speaking_attempts(current_user: DebugPrincipal, session: AsyncSession):
    rows = (await session.execute(
        select(SpeakingSession, SpeakingEvaluation, SpeakingTest)
        .join(SpeakingTest, SpeakingTest.id == SpeakingSession.speaking_test_id)
        .join(SpeakingEvaluation, SpeakingEvaluation.speaking_session_id == SpeakingSession.id)
        .where(SpeakingSession.user_id == current_user.id)
        .where(SpeakingEvaluation.overall_band.is_not(None))
    )).all()

    adapters = []
    for speaking_session, evaluation, speaking_test in rows:
        entry_mode = str(speaking_session.entry_mode or "full")
        part_numbers = _speaking_entry_mode_parts(entry_mode)
        scope = TestScope.full if entry_mode == "full" else TestScope.section
        started_at = speaking_session.started_at or speaking_session.created_at
        completed_at = speaking_session.graded_at or speaking_session.ended_at or speaking_session.created_at
        time_spent_sec = 0
        if started_at and (speaking_session.ended_at or completed_at):
            ended_at = speaking_session.ended_at or completed_at
            time_spent_sec = max(0, int((ended_at - started_at).total_seconds()))

        criteria = {
            "fluency": evaluation.fluency_band,
            "lexical_resource": evaluation.lexical_band,
            "grammar": evaluation.grammar_band,
            "pronunciation": evaluation.pronunciation_band,
        }

        adapters.append(AttemptRuntime(
            attempt_id=speaking_session.id,
            user_id=speaking_session.user_id,
            test_id=speaking_session.id,
            test_version=1,
            scope=scope,
            section_id=None,
            mode=TestMode.practice,
            status=AttemptStatus.completed,
            started_at=started_at,
            completed_at=completed_at,
            time_spent_sec=time_spent_sec,
            raw_score=None,
            total_questions=0,
            band_score=Decimal(str(evaluation.overall_band)),
            test_snapshot={
                "test_type": TestType.speaking.value,
                "scope": scope.value,
                "format": entry_mode,
                "sections": [
                    {"section_number": part_number, "title": f"Part {part_number}"}
                    for part_number in part_numbers
                ],
                "title": speaking_test.title,
            },
            metadata={"speaking_criteria": criteria},
            scoring_items=[],
        ))

    return adapters

async def get_stats(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeStatsRead:
    attempts = await _load_attempts(current_user, session)
    user = await session.get(User, current_user.id)
    completed = [attempt for attempt in attempts if attempt.status == AttemptStatus.completed]
    banded = [
        band
        for attempt in completed
        if (band := _effective_attempt_band_score(attempt)) is not None
    ]
    reading_bands = [
        band
        for attempt in completed
        if attempt.test_snapshot.get("test_type") == TestType.reading
        and (band := _effective_attempt_band_score(attempt)) is not None
    ]
    listening_bands = [
        band
        for attempt in completed
        if attempt.test_snapshot.get("test_type") == TestType.listening
        and (band := _effective_attempt_band_score(attempt)) is not None
    ]
    average_band = (
        sum(banded, start=banded[0].__class__("0")) / len(banded)
        if banded
        else None
    )
    weekly_xp = await get_user_period_xp(session, user_id=current_user.id, period_type=PERIOD_WEEKLY)
    monthly_xp = await get_user_period_xp(session, user_id=current_user.id, period_type=PERIOD_MONTHLY)
    leaderboard_rank = await _leaderboard_rank_for_user(session, user_id=current_user.id)
    return MeStatsRead(
        attempts_total=len(attempts),
        current_streak=int((user.current_streak if user else current_user.model_dump().get("current_streak")) or 0),
        average_band=average_band,
        reading_band=max(reading_bands) if reading_bands else None,
        listening_band=max(listening_bands) if listening_bands else None,
        leaderboard_rank=leaderboard_rank if current_user.show_on_leaderboard else None,
        active_sessions=2,
        total_xp=int(user.total_xp or 0) if user is not None else 0,
        current_level=int(user.current_level or 1) if user is not None else 1,
        weekly_xp=weekly_xp,
        monthly_xp=monthly_xp,
    )

async def get_xp_summary(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeXpSummaryRead:
    user = await session.get(User, current_user.id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User account was not found.")
    return await _user_xp_summary(session, user)

async def get_xp_transactions(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    limit: int = Query(default=30, ge=1, le=100),
) -> list[MeXpTransactionRead]:
    rows = await list_user_xp_transactions(session, user_id=current_user.id, limit=limit)
    return [_serialize_xp_transaction(row) for row in rows]

async def get_activity(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[MeActivityPointRead]:
    attempts = await _load_attempts(current_user, session)
    attempts.extend(await _load_writing_attempts(current_user, session))
    attempts.extend(await _load_speaking_attempts(current_user, session))
    grouped: dict[date, dict[str, int]] = {}
    for attempt in attempts:
        key = attempt.started_at.date()
        entry = grouped.setdefault(key, {
            "attempts_count": 0, 
            "time_spent_sec": 0,
            "reading_time_sec": 0,
            "listening_time_sec": 0,
            "writing_time_sec": 0,
            "speaking_time_sec": 0,
        })
        entry["attempts_count"] += 1
        entry["time_spent_sec"] += attempt.time_spent_sec
        
        test_type = str(attempt.test_snapshot.get("test_type", ""))
        if test_type == "reading":
            entry["reading_time_sec"] += attempt.time_spent_sec
        elif test_type == "listening":
            entry["listening_time_sec"] += attempt.time_spent_sec
        elif test_type == "writing":
            entry["writing_time_sec"] += attempt.time_spent_sec
        elif test_type == "speaking":
            entry["speaking_time_sec"] += attempt.time_spent_sec

    return [
        MeActivityPointRead(activity_date=activity_date, **values)
        for activity_date, values in sorted(grouped.items(), reverse=True)
    ]
