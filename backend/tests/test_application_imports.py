from importlib import import_module


def test_application_imports_without_circular_dependencies() -> None:
    part_01 = import_module("app.services.test_content_repo_part_01")
    part_06 = import_module("app.services.test_content_repo_part_06")
    main = import_module("app.main")

    assert callable(part_01._refresh_in_progress_attempt_snapshots_for_test)
    assert callable(part_06.build_test_snapshot_from_db)
    assert main.app is not None
