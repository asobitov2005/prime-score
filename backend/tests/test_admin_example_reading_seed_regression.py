from app.services.admin_example_reading_common import ADMIN_EXAMPLE_READING_TEST_ID
from app.services.admin_example_reading_seed import build_admin_example_reading_draft


def test_admin_example_reading_seed_builds_complete_draft() -> None:
    draft = build_admin_example_reading_draft()

    assert draft["metadata"]["id"] == ADMIN_EXAMPLE_READING_TEST_ID
    assert len(draft["content"]["sections"]) == 3
    assert len(draft["questionGroups"]) >= 9
    assert len(draft["questions"]) == 40
    assert sum(len(group["questions"]) for group in draft["questionGroups"]) == 40
