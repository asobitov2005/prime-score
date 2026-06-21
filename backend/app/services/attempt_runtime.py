from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from uuid import UUID

from app.core.enums import AttemptStatus, TestMode, TestScope, TestType

READING_BAND_TABLE = [
    (39, 40, Decimal("9.0")),
    (37, 38, Decimal("8.5")),
    (35, 36, Decimal("8.0")),
    (33, 34, Decimal("7.5")),
    (30, 32, Decimal("7.0")),
    (27, 29, Decimal("6.5")),
    (23, 26, Decimal("6.0")),
    (19, 22, Decimal("5.5")),
    (15, 18, Decimal("5.0")),
    (13, 14, Decimal("4.5")),
    (10, 12, Decimal("4.0")),
    (8, 9, Decimal("3.5")),
    (6, 7, Decimal("3.0")),
    (4, 5, Decimal("2.5")),
    (3, 3, Decimal("2.0")),
    (2, 2, Decimal("1.0")),
]

LISTENING_BAND_TABLE = [
    (39, 40, Decimal("9.0")),
    (37, 38, Decimal("8.5")),
    (35, 36, Decimal("8.0")),
    (32, 34, Decimal("7.5")),
    (30, 31, Decimal("7.0")),
    (26, 29, Decimal("6.5")),
    (23, 25, Decimal("6.0")),
    (18, 22, Decimal("5.5")),
    (16, 17, Decimal("5.0")),
    (13, 15, Decimal("4.5")),
    (11, 12, Decimal("4.0")),
    (8, 10, Decimal("3.5")),
    (6, 7, Decimal("3.0")),
    (4, 5, Decimal("2.5")),
    (3, 3, Decimal("2.0")),
    (2, 2, Decimal("1.0")),
]


@dataclass(slots=True)
class AttemptRuntime:
    attempt_id: UUID
    user_id: UUID
    test_id: UUID
    test_version: int
    scope: TestScope
    section_id: UUID | None
    mode: TestMode
    status: AttemptStatus = AttemptStatus.in_progress
    started_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: datetime | None = None
    updated_at: datetime | None = None
    time_spent_sec: int = 0
    raw_score: int | None = None
    total_questions: int = 0
    band_score: Decimal | None = None
    test_snapshot: dict[str, object] = field(default_factory=dict)
    metadata: dict[str, object] = field(default_factory=dict)
    answers: dict[str, str] = field(default_factory=dict)
    answer_numbers: dict[str, int] = field(default_factory=dict)
    scoring_items: list[dict[str, object]] = field(default_factory=list)
    section_breakdown: list[dict[str, object]] = field(default_factory=list)
    question_type_breakdown: list[dict[str, object]] = field(default_factory=list)


def _band_for_raw_score(test_type: TestType, raw_score: int) -> Decimal | None:
    if test_type == TestType.reading:
        table = READING_BAND_TABLE
    elif test_type == TestType.listening:
        table = LISTENING_BAND_TABLE
    else:
        return None
    for minimum, maximum, band in table:
        if minimum <= raw_score <= maximum:
            return band
    return None


def band_for_raw_score(test_type: TestType, raw_score: int) -> Decimal:
    normalized_raw_score = max(0, min(40, int(raw_score)))
    return _band_for_raw_score(test_type, normalized_raw_score) or Decimal("0.0")
