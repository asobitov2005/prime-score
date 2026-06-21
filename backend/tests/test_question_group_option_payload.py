from __future__ import annotations

from app.services.test_content_repo import _sanitize_group_option_payload


def test_freetext_summary_completion_clears_option_payload() -> None:
    secondary_block, options_title, shared_options = _sanitize_group_option_payload(
        "reading_summary_completion_freetext",
        secondary_block="Uses of a popular tree",
        options_title="Options",
        shared_options=["Uses of a popular tree"],
    )

    assert secondary_block == ""
    assert options_title == ""
    assert shared_options == []


def test_wordbank_completion_keeps_option_payload() -> None:
    secondary_block, options_title, shared_options = _sanitize_group_option_payload(
        "reading_summary_completion_wordbank",
        secondary_block="A trees\nB humans",
        options_title="List of words",
        shared_options=["trees", "humans"],
    )

    assert secondary_block == "A trees\nB humans"
    assert options_title == "List of words"
    assert shared_options == ["trees", "humans"]


def test_matching_information_keeps_shared_options_but_clears_secondary_block() -> None:
    secondary_block, options_title, shared_options = _sanitize_group_option_payload(
        "reading_matching_information",
        secondary_block="Should not appear",
        options_title="Options",
        shared_options=["A", "B", "C"],
    )

    assert secondary_block == ""
    assert options_title == ""
    assert shared_options == ["A", "B", "C"]
