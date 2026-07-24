from importlib import import_module


def test_application_imports_without_circular_dependencies() -> None:
    module = import_module("app.main")

    assert module.app is not None
