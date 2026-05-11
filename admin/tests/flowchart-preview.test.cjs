const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("admin test editor renders flowchart completions as staged preview blocks", () => {
  const filename = path.join(__dirname, "../components/test-editor-wizard.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /function hasFlowChartSeparators\(text: string\)/);
  assert.match(source, /function renderFlowChartCompletionPreview\(group: AdminTestDraftState\["questionGroups"\]\[number\]\)/);
  assert.match(source, /questionBlock\.split\(\/\\r\?\\n\\s\*\\\\\+\\s\*\\r\?\\n\/\)/);
  assert.match(source, /<ArrowDown className="h-4 w-4" \/>/);
  assert.match(source, /hasFlowChartSeparators\(questionBlock\)/);
  assert.match(source, /className="w-full text-center"/);
  assert.match(source, /className="flex h-9 w-9 items-center justify-center rounded-full border border-border\/70 bg-background text-muted-foreground shadow-sm"/);
});
