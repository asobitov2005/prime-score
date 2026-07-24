from __future__ import annotations

# ruff: noqa: F401,F403,F405,E501
from app.api.routes.writing_dependencies import *

router = APIRouter()

@router.get("/dashboard-summary", response_model=WritingDashboardSummary)
async def dashboard_summary(
    current_user: DebugPrincipal = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> WritingDashboardSummary:
    completed_filter = [
        WritingSubmission.user_id == current_user.id,
        WritingSubmission.status == WritingSubmissionStatus.COMPLETED,
    ]

    total = await session.scalar(
        select(func.count())
        .select_from(WritingSubmission)
        .where(*completed_filter)
    ) or 0

    if total == 0:
        return WritingDashboardSummary(total_submissions=0)

    avg_band, best_band = (
        await session.execute(
            select(
                func.avg(WritingEvaluation.overall_band),
                func.max(WritingEvaluation.overall_band),
            )
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(*completed_filter)
        )
    ).one()

    last_row = (
        await session.execute(
            select(WritingEvaluation.overall_band, WritingSubmission.submitted_at)
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(*completed_filter)
            .order_by(WritingSubmission.submitted_at.desc())
            .limit(1)
        )
    ).first()

    last_band = float(last_row[0]) if last_row else None
    last_submitted_at = last_row[1] if last_row else None

    # Per-task averages/best/last across ALL completed submissions (not a
    # paginated slice), so the dashboard reflects the user's true stats. We must
    # filter via the `== WritingTaskType.X` comparator (not GROUP BY) because the
    # EnumValueString comparator transparently matches legacy mixed-case rows
    # ('task_1' and 'TASK_1'); a raw GROUP BY would split those into two groups.
    async def _task_stats(
        task_type: WritingTaskType,
    ) -> tuple[float | None, float | None, float | None]:
        task_filter = [*completed_filter, WritingSubmission.task_type == task_type]
        avg_value, best_value = (
            await session.execute(
                select(
                    func.avg(WritingEvaluation.overall_band),
                    func.max(WritingEvaluation.overall_band),
                )
                .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
                .where(*task_filter)
            )
        ).one()
        last_value = await session.scalar(
            select(WritingEvaluation.overall_band)
            .join(WritingSubmission, WritingSubmission.id == WritingEvaluation.submission_id)
            .where(*task_filter)
            .order_by(WritingSubmission.submitted_at.desc())
            .limit(1)
        )
        return (
            float(avg_value) if avg_value is not None else None,
            float(best_value) if best_value is not None else None,
            float(last_value) if last_value is not None else None,
        )

    task_1_average, task_1_best, task_1_last = await _task_stats(WritingTaskType.TASK_1)
    task_2_average, task_2_best, task_2_last = await _task_stats(WritingTaskType.TASK_2)

    return WritingDashboardSummary(
        total_submissions=int(total),
        average_band=float(avg_band) if avg_band is not None else None,
        best_band=float(best_band) if best_band is not None else None,
        last_band=last_band,
        last_submitted_at=last_submitted_at,
        task_1_average=task_1_average,
        task_2_average=task_2_average,
        task_1_best=task_1_best,
        task_2_best=task_2_best,
        task_1_last=task_1_last,
        task_2_last=task_2_last,
    )
