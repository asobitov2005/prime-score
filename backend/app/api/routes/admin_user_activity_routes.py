from __future__ import annotations

# Generated from the former monolithic admin router. Keep imports centralized
# while domain modules are gradually tightened to explicit dependencies.
# ruff: noqa: F401,F403,F405
from app.api.routes.admin_dependencies import *
from app.api.routes.admin_contracts import *
from app.api.routes.admin_common import *
from app.api.routes.admin_commerce_support import *
from app.api.routes.admin_auth_support import *
from app.api.routes.admin_user_support import *

router = APIRouter()

async def get_user(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
    params: AdminFilterParams = Depends(),
) -> AdminUserDetailRead:
    _ = current_admin
    try:
        user = await _get_active_user_or_404(session, user_id)
        return await _build_admin_user_detail(session, user, params)
    except HTTPException:
        raise
    except Exception:
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load user.")

async def get_user_activity(
    user_id: UUID,
    current_admin: AdminPrincipal = Depends(get_current_admin),
    session: AsyncSession = Depends(get_db_session),
) -> AdminUserActivityRead:
    _ = current_admin
    try:
        user = await _get_active_user_or_404(session, user_id)

        attempts = await iter_user_attempts_from_db(session, user_id=user.id)
        attempt_items: list[AdminUserAttemptRead] = []
        for attempt in attempts:
            result = None
            review = None
            if attempt.raw_score is not None or attempt.status in COMPLETED_ATTEMPT_STATUSES:
                result = _serialize_admin_attempt_result(attempt)
                review = _serialize_admin_attempt_review(
                    attempt,
                    can_show_explanations=user.is_premium,
                )

            attempt_items.append(
                AdminUserAttemptRead(
                    attempt_id=attempt.attempt_id,
                    test_id=attempt.test_id,
                    test_title=str(attempt.test_snapshot.get("title") or "") or None,
                    test_type=attempt.test_snapshot.get("test_type"),
                    scope=str(attempt.scope.value),
                    mode=str(attempt.mode.value),
                    status=str(attempt.status.value),
                    score_status=str(attempt.metadata.get("score_status", "queued")),
                    raw_score=attempt.raw_score,
                    band_score=_effective_band_score(
                        attempt.test_snapshot,
                        attempt.raw_score,
                        attempt.band_score,
                        attempt.total_questions,
                    ),
                    answers_count=_count_answered_values(attempt.answers),
                    answered_slots_count=_count_answered_slots(attempt.test_snapshot, attempt.answers),
                    total_questions=attempt.total_questions,
                    time_spent_sec=attempt.time_spent_sec,
                    started_at=attempt.started_at,
                    completed_at=attempt.completed_at,
                    result=result,
                    review=review,
                )
            )

        writing_rows = (
            await session.execute(
                select(WritingSubmission, WritingTask, WritingEvaluation)
                .join(WritingTask, WritingTask.id == WritingSubmission.task_id)
                .outerjoin(
                    WritingEvaluation,
                    WritingEvaluation.submission_id == WritingSubmission.id,
                )
                .where(WritingSubmission.user_id == user.id)
                .order_by(WritingSubmission.submitted_at.desc())
            )
        ).all()
        writing_submissions = [
            _serialize_submission_read(
                submission=submission,
                task=task,
                evaluation=evaluation,
                user=user,
            )
            for submission, task, evaluation in writing_rows
        ]

        return AdminUserActivityRead(
            attempts=attempt_items,
            writing_submissions=writing_submissions,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Failed to load admin user activity")
        try:
            await session.rollback()
        except Exception:
            pass
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to load user activity.") from exc
