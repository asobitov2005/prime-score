#!/usr/bin/env bash
set -euo pipefail

node scripts/reorder_reading_exam_effects.cjs

python - <<'PY'
import re
from pathlib import Path

path = Path("scripts/refactor_medium_ui_architecture.cjs")
text = path.read_text()
targets = '''const TARGETS = [
  "frontend/components/exam/reading-exam-preview.tsx",
];'''
text = re.sub(
    r"const TARGETS = \[.*?\n\];",
    targets,
    text,
    count=1,
    flags=re.S,
)
text = text.replace(
    "const MAX_BODY_LINES = 220;",
    "const MAX_BODY_LINES = 285;",
)
text = text.replace(
    "const controllerParts = packGroups(controllerUnits, groups, 255);",
    "const controllerParts = packGroups(controllerUnits, groups, 285);",
)
text = text.replace(
    "if (lineCount(nodeText) > 210 && children.length > 1) {",
    "if (lineCount(nodeText) > 145 && children.length > 0) {",
)
text = text.replace(
    'if (lineCount(childText) < 35 && lineCount(nodeText) < 280) continue;',
    'if (lineCount(childText) < 10 && lineCount(nodeText) < 230) continue;',
)
text = text.replace(
    "if (lineCount(nodeText) > 235) {",
    "if (lineCount(nodeText) > 285) {",
)
path.write_text(text)
PY

rm -rf frontend/components/exam/reading-exam-preview-modules
node scripts/refactor_medium_ui_architecture.cjs
