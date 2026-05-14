from __future__ import annotations

from sqlalchemy import column, select

from app.models.enum_values import EnumValueString
from app.models.enums import WritingSubmissionStatus


def test_enum_value_string_accepts_lowercase_values_and_uppercase_names() -> None:
    enum_type = EnumValueString(WritingSubmissionStatus)

    assert (
        enum_type.process_bind_param(WritingSubmissionStatus.QUEUED, None)
        == "queued"
    )
    assert (
        enum_type.process_bind_param("QUEUED", None)
        == "queued"
    )
    assert (
        enum_type.process_result_value("queued", None)
        == WritingSubmissionStatus.QUEUED
    )
    assert (
        enum_type.process_result_value("QUEUED", None)
        == WritingSubmissionStatus.QUEUED
    )


def test_enum_value_string_comparator_matches_legacy_name_rows() -> None:
    enum_type = EnumValueString(WritingSubmissionStatus)
    status_column = column("status", enum_type)

    compiled_eq = str(
        select(status_column)
        .where(status_column == WritingSubmissionStatus.QUEUED)
        .compile(compile_kwargs={"literal_binds": True})
    )
    compiled_in = str(
        select(status_column)
        .where(status_column.in_([WritingSubmissionStatus.QUEUED]))
        .compile(compile_kwargs={"literal_binds": True})
    )

    assert "IN ('queued', 'QUEUED')" in compiled_eq
    assert "IN ('queued', 'QUEUED')" in compiled_in
