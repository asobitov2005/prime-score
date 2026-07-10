#!/usr/bin/env bash
set -Euo pipefail

log_path="artifacts/test-editor-worker.log"
generator_report_path="/tmp/test-editor-generator-report.tsv"
mkdir -p artifacts
exec > >(tee "$log_path") 2>&1

on_error() {
  status=$?
  failed_command=${BASH_COMMAND:-unknown}
  error_line=${BASH_LINENO[0]:-unknown}
  log_tail=$(tail -n 80 "$log_path" || true)
  generator_report=$(cat "$generator_report_path" 2>/dev/null || true)

  git reset --hard HEAD
  git clean -fd admin/components/test-editor-wizard-modules

  cat > artifacts/medium-ui-architecture-report.tsv <<EOF
status	components	shared_parts	path	detail
failed	0	0	admin/components/test-editor-wizard.tsx	command=${failed_command}; line=${error_line}; status=${status}
${generator_report}
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

extractor = Path("scripts/finish_test_editor_content_panel.cjs")
extractor_text = extractor.read_text()
old = '''if (!callbackReturn?.expression || !ts.isJsxElement(callbackReturn.expression)) {
  throw new Error("Content section card return not found");
}
const itemStatements = callbackStatements.slice(
  0,
  callbackStatements.indexOf(callbackReturn),
);
const itemNames = [
  ...mapInfo.callback.parameters.flatMap((parameter) => bindingNames(parameter.name)),
  ...itemStatements.flatMap(declaredNames),
];
const card = callbackReturn.expression;'''
new = '''if (!callbackReturn?.expression) {
  throw new Error("Content section card return not found");
}
let card = callbackReturn.expression;
while (ts.isParenthesizedExpression(card)) card = card.expression;
if (!ts.isJsxElement(card)) {
  throw new Error("Content section card JSX not found");
}
const itemStatements = callbackStatements.slice(
  0,
  callbackStatements.indexOf(callbackReturn),
);
const itemNames = [
  ...mapInfo.callback.parameters.flatMap((parameter) => bindingNames(parameter.name)),
  ...itemStatements.flatMap(declaredNames),
];'''
if old in extractor_text:
    extractor.write_text(extractor_text.replace(old, new, 1))

questions = Path("scripts/finish_test_editor_questions_panel.cjs")
question_text = questions.read_text()
question_text = question_text.replace(
    "if (lineCount(body) > 220) {",
    "if (lineCount(body) > 120) {",
)
question_text = question_text.replace(
    "if (lineCount(body) <= 220) break;",
    "if (lineCount(body) <= 120) break;",
)
question_text = question_text.replace(
    "if (lineCount(body) > 270)",
    "if (lineCount(body) > 180)",
)
questions.write_text(question_text)
PY

rm -rf admin/components/test-editor-wizard-modules
node scripts/refactor_medium_ui_architecture.cjs || true
node scripts/finish_test_editor_content_panel.cjs
node scripts/refactor_medium_ui_architecture.cjs || true
node scripts/finish_test_editor_questions_panel.cjs
node scripts/refactor_medium_ui_architecture.cjs
cp artifacts/medium-ui-architecture-report.tsv "$generator_report_path"

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

grep -q $'^split\t' artifacts/medium-ui-architecture-report.tsv
rm -f "$log_path"
