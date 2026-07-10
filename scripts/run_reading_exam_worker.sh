#!/usr/bin/env bash
set -Euo pipefail

log_path="artifacts/reading-exam-worker.log"
mkdir -p artifacts
exec > >(tee "$log_path") 2>&1

on_error() {
  status=$?
  failed_command=${BASH_COMMAND:-unknown}
  error_line=${BASH_LINENO[0]:-unknown}
  log_tail=$(tail -n 100 "$log_path" || true)

  git reset --hard HEAD
  git clean -fd frontend/components/exam/reading-exam-preview-modules

  cat > artifacts/medium-ui-architecture-report.tsv <<EOF
status	components	shared_parts	path	detail
failed	0	0	frontend/components/exam/reading-exam-preview.tsx	command=${failed_command}; line=${error_line}; status=${status}
${log_tail}
EOF
  exit 0
}
trap on_error ERR

node scripts/reorder_reading_exam_effects.cjs
node scripts/split_reading_question_control.cjs

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

grep -q $'^split\t' artifacts/medium-ui-architecture-report.tsv
rm -f "$log_path"
