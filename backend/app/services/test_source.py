from __future__ import annotations

from app.models.enums import TestSource


TEST_SOURCE_LABELS: dict[TestSource, str] = {
    TestSource.CAMBRIDGE: "Cambridge Official",
    TestSource.REAL_EXAM: "Recent Exam Papers",
    TestSource.CUSTOM: "Exam Practice Tests",
}


def normalize_test_source(source: TestSource | str | None) -> TestSource:
    if isinstance(source, TestSource):
        return source

    normalized = str(source or "").strip().lower()
    if normalized == TestSource.CAMBRIDGE.value or "cambridge" in normalized:
        return TestSource.CAMBRIDGE
    if normalized == TestSource.REAL_EXAM.value or "real exam" in normalized or "recent exam papers" in normalized:
        return TestSource.REAL_EXAM
    return TestSource.CUSTOM


def get_test_source_label(source: TestSource | str | None) -> str:
    return TEST_SOURCE_LABELS[normalize_test_source(source)]


def normalize_test_source_detail(source: TestSource | str | None, detail: str | None) -> str:
    normalized_detail = str(detail or "").strip().lower()
    if normalized_detail in {
        "",
        "cambridge official",
        "real exam material",
        "custom practice",
        "recent exam papers",
        "exam practice tests",
    }:
        return get_test_source_label(source)
    return str(detail or "").strip()
