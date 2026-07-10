from app.services import runtime_store
from app.services.attempt_runtime import _band_for_raw_score
from app.tasks import celery_app


def test_runtime_store_keeps_band_score_export() -> None:
    assert runtime_store.band_for_raw_score is _band_for_raw_score


def test_tasks_package_exports_celery_application() -> None:
    assert celery_app is not None
