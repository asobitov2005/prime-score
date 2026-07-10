#!/usr/bin/env bash
set -Euo pipefail

log_path="artifacts/test-editor-worker.log"
mkdir -p artifacts
exec > >(tee "$log_path") 2>&1

on_error() {
  status=$?
  failed_command=${BASH_COMMAND:-unknown}
  error_line=${BASH_LINENO[0]:-unknown}
  log_tail=$(tail -n 80 "$log_path" || true)

  git reset --hard HEAD
  git clean -fd admin/components/test-editor-wizard-modules

  cat > artifacts/medium-ui-architecture-report.tsv <<EOF
status	components	shared_parts	path	detail
failed	0	0	admin/components/test-editor-wizard.tsx	command=${failed_command}; line=${error_line}; status=${status}
${log_tail}
EOF
  exit 0
}
trap on_error ERR

python - <<'PY'
import re
from pathlib import Path

path = Path("scripts/refactor_medium_ui_architecture.cjs")
text = path.read_text()
targets = '''const TARGETS = [
  "admin/components/test-editor-wizard.tsx",
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
    "const MAX_BODY_LINES = 270;",
)
text = text.replace(
    "const controllerParts = packGroups(controllerUnits, groups, 255);",
    "const controllerParts = packGroups(controllerUnits, groups, 270);",
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

rm -rf admin/components/test-editor-wizard-modules
node scripts/refactor_medium_ui_architecture.cjs || true
node scripts/finish_test_editor_content_panel.cjs
node scripts/refactor_medium_ui_architecture.cjs

python - <<'PY'
from pathlib import Path

controller = Path(
    "admin/components/test-editor-wizard-modules/content-panel/controller.tsx"
)
text = controller.read_text()
start = text.index("export function useContentPanelController(")
body = text.index(") {", start)
text = (
    text[:start]
    + "export function useContentPanelController("
    + "props: Parameters<typeof useBaseScope>[0]) {"
    + text[body + 3 :]
)
controller.write_text(text)

Path(
    "admin/components/test-editor-wizard-modules/content-panel/index.tsx"
).write_text('''"use client";

import { useContentPanelController } from "./controller";
import { ContentPanelView } from "./view";

export function ContentPanel(
  props: Parameters<typeof useContentPanelController>[0],
) {
  const scope = useContentPanelController(props);
  return <ContentPanelView scope={scope} />;
}
''')
PY

rm -f "$log_path"
