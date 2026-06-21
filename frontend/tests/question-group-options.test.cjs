const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("question group option helpers clear free-text completion payload", () => {
  const filename = path.join(__dirname, "../lib/question-group-options.ts");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /export function sanitizeQuestionGroupOptionFields/);
  assert.match(source, /secondaryBlock: ""/);
  assert.match(source, /optionsTitle: ""/);
});
