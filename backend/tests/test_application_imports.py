from __future__ import annotations

import os
import subprocess
import sys
from pathlib import Path


def test_application_imports_without_circular_dependencies() -> None:
    backend_dir = Path(__file__).resolve().parents[1]
    result = subprocess.run(
        [sys.executable, "-c", "from app.main import app; assert app is not None"],
        cwd=backend_dir,
        env=os.environ.copy(),
        capture_output=True,
        text=True,
        check=False,
    )

    assert result.returncode == 0, result.stderr
