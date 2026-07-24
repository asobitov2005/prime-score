from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.me_dependencies import *
from app.api.routes.me_part_01 import _build_progress_series, _build_question_type_analysis
from app.api.routes.me_part_02 import _build_comparison, _build_error_distribution, _build_section_analysis
from app.api.routes.me_part_03 import _build_performance_summary, _build_skill_focus, _build_time_analysis
from app.api.routes.me_part_05 import _filter_attempts_by_type, _load_attempts
from app.api.routes.me_part_06 import _load_speaking_attempts, _load_writing_attempts
from app.api.routes.me_part_07 import _build_accuracy_trend, _build_improvement_rate, _build_personal_bests, _build_score_distribution, _build_speed_metrics, _build_weekly_activity

router = APIRouter()

@router.get("/analytics", response_model=MeDashboardAnalyticsRead)
async def get_dashboard_analytics(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
    test_type: TestType | None = Query(default=None),
) -> MeDashboardAnalyticsRead:
    all_attempts = await _load_attempts(current_user, session)
    writing_attempts = await _load_writing_attempts(current_user, session)
    speaking_attempts = await _load_speaking_attempts(current_user, session)
    all_attempts.extend(writing_attempts)
    all_attempts.extend(speaking_attempts)
    completed = [
        attempt
        for attempt in all_attempts
        if attempt.status in {AttemptStatus.completed, AttemptStatus.auto_submitted}
    ]
    filtered_completed = _filter_attempts_by_type(completed, test_type)
    analysis = _build_question_type_analysis(filtered_completed, test_type)
    section_analysis = _build_section_analysis(filtered_completed, test_type)
    return MeDashboardAnalyticsRead(
        performance_summary=_build_performance_summary(filtered_completed),
        writing_criteria=_build_writing_criteria(filtered_completed),
        speaking_criteria=_build_speaking_criteria(filtered_completed),
        question_type_analysis=analysis,
        comparison=_build_comparison(filtered_completed, test_type),
        error_distribution=_build_error_distribution(analysis),
        progress_series=_build_progress_series(filtered_completed),
        accuracy_trend=_build_accuracy_trend(filtered_completed),
        weekly_activity=_build_weekly_activity(all_attempts),
        score_distribution=_build_score_distribution(filtered_completed),
        personal_bests=_build_personal_bests(all_attempts, filtered_completed),
        speed_metrics=_build_speed_metrics(filtered_completed),
        improvement_rate=_build_improvement_rate(filtered_completed),
        section_analysis=section_analysis,
        skill_focus=_build_skill_focus(filtered_completed, test_type, section_analysis),
        time_analysis=_build_time_analysis(filtered_completed, test_type, section_analysis),
    )

def _build_writing_criteria(attempts) -> MeWritingCriteriaRead | None:
    writing_attempts = [
        a for a in attempts
        if a.test_snapshot.get("test_type") == "writing"
        and a.metadata.get("writing_criteria")
    ]
    if not writing_attempts:
        return None

    ta, cc, lr, gra = 0.0, 0.0, 0.0, 0.0
    count_ta, count_cc, count_lr, count_gra = 0, 0, 0, 0

    for a in writing_attempts:
        c = a.metadata["writing_criteria"]
        if c.get("task_achievement") is not None:
            ta += float(c["task_achievement"])
            count_ta += 1
        if c.get("coherence_cohesion") is not None:
            cc += float(c["coherence_cohesion"])
            count_cc += 1
        if c.get("lexical_resource") is not None:
            lr += float(c["lexical_resource"])
            count_lr += 1
        if c.get("grammatical_range_accuracy") is not None:
            gra += float(c["grammatical_range_accuracy"])
            count_gra += 1

    if all(count == 0 for count in [count_ta, count_cc, count_lr, count_gra]):
        return None

    return MeWritingCriteriaRead(
        task_achievement=round(ta / count_ta, 2) if count_ta > 0 else None,
        coherence_cohesion=round(cc / count_cc, 2) if count_cc > 0 else None,
        lexical_resource=round(lr / count_lr, 2) if count_lr > 0 else None,
        grammatical_range_accuracy=round(gra / count_gra, 2) if count_gra > 0 else None,
    )

def _build_speaking_criteria(attempts) -> MeSpeakingCriteriaRead | None:
    speaking_attempts = [
        a for a in attempts
        if a.test_snapshot.get("test_type") == "speaking"
        and a.metadata.get("speaking_criteria")
    ]
    if not speaking_attempts:
        return None

    totals = {"fluency": 0.0, "lexical_resource": 0.0, "grammar": 0.0, "pronunciation": 0.0}
    counts = {key: 0 for key in totals}
    for attempt in speaking_attempts:
        criteria = attempt.metadata["speaking_criteria"]
        for key in totals:
            if criteria.get(key) is None:
                continue
            totals[key] += float(criteria[key])
            counts[key] += 1

    if all(count == 0 for count in counts.values()):
        return None

    return MeSpeakingCriteriaRead(
        fluency=round(totals["fluency"] / counts["fluency"], 2) if counts["fluency"] > 0 else None,
        lexical_resource=round(totals["lexical_resource"] / counts["lexical_resource"], 2) if counts["lexical_resource"] > 0 else None,
        grammar=round(totals["grammar"] / counts["grammar"], 2) if counts["grammar"] > 0 else None,
        pronunciation=round(totals["pronunciation"] / counts["pronunciation"], 2) if counts["pronunciation"] > 0 else None,
    )

@router.get("/favorites", response_model=list[FavoriteTestRead])
async def get_favorites(current_user: DebugPrincipal = Depends(get_current_user)) -> list[FavoriteTestRead]:
    _ = current_user
    return []

@router.post("/favorites/{test_id}", response_model=MessageResponse)
async def add_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite added.")

@router.delete("/favorites/{test_id}", response_model=MessageResponse)
async def remove_favorite(test_id: UUID, current_user: DebugPrincipal = Depends(get_current_user)) -> MessageResponse:
    _ = (test_id, current_user)
    return MessageResponse(message="Favorite removed.")

class NotificationRead(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    is_read: bool
    created_at: str

@router.get("/notifications", response_model=list[NotificationRead])
async def list_notifications(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> list[NotificationRead]:
    try:
        result = await session.scalars(
            select(Notification)
            .where(Notification.user_id == current_user.id)
            .order_by(Notification.created_at.desc())
            .limit(50)
        )
        notifications = list(result.all())
        return [
            NotificationRead(
                id=n.id,
                type=n.type.value if hasattr(n.type, "value") else str(n.type),
                title=n.title,
                body=n.body,
                is_read=n.is_read,
                created_at=n.created_at.isoformat() if n.created_at else "",
            )
            for n in notifications
        ]
    except Exception:
        return []

@router.patch("/notifications/{notification_id}/read", response_model=MessageResponse)
async def mark_notification_read(
    notification_id: UUID,
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    n = await session.get(Notification, notification_id)
    if n and n.user_id == current_user.id:
        n.is_read = True
        await session.commit()
    return MessageResponse(message="Marked as read.")

@router.patch("/notifications/read-all", response_model=MessageResponse)
async def mark_all_read(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MessageResponse:
    await session.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await session.commit()
    return MessageResponse(message="All marked as read.")
