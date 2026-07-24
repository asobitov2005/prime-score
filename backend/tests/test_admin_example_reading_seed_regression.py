from app.services.admin_example_reading_seed import build_admin_example_reading_draft


def test_admin_example_reading_seed_builds_complete_draft() -> None:
    draft = build_admin_example_reading_draft()

    assert len(draft["content"]) == 3
    assert len(draft["question_groups"]) >= 9
    assert sum(len(group["questions"]) for group in draft["question_groups"]) == 40
