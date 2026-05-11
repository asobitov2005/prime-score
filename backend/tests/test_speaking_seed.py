from __future__ import annotations

from collections import Counter

from app.services.speaking_seed import (
    CROSS_PART_CATEGORIES,
    PART1_CORE_CATEGORIES,
    build_speaking_topic_seed_rows,
)


def test_speaking_seed_rows_cover_minimum_category_matrix() -> None:
    rows = build_speaking_topic_seed_rows()

    assert len([row for row in rows if row["part_number"] == 1]) >= 20
    assert len([row for row in rows if row["part_number"] == 2]) >= 20
    assert len([row for row in rows if row["part_number"] == 3]) >= 20

    part1_counts = Counter()
    part2_counts = Counter()
    part3_counts = Counter()

    for row in rows:
        categories = row["category_tags"]
        assert categories
        primary = categories[0]
        if row["part_number"] == 1:
            part1_counts[primary] += 1
        elif row["part_number"] == 2:
            part2_counts[primary] += 1
        elif row["part_number"] == 3:
            part3_counts[primary] += 1

    for category in PART1_CORE_CATEGORIES:
        assert part1_counts[category] >= 2

    for category in CROSS_PART_CATEGORIES:
        assert part2_counts[category] >= 2
        assert part3_counts[category] >= 2
