const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("writing result UI exposes natural C1/C2 upgrade panel", () => {
  const filename = path.join(
    __dirname,
    "../app/(app)/writing/submissions/[submissionId]/result/result-client.tsx",
  );
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /Natural C1\/C2 upgrades \(/);
  assert.match(source, /Compact upgrades with one example sentence each\./);
  assert.match(source, /Strongest area/);
  assert.match(source, /Main score limiter/);
});

test("writing submission result type includes vocabulary suggestions", () => {
  const filename = path.join(__dirname, "../lib/server-writing.ts");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /export interface WritingVocabularySuggestion/);
  assert.match(source, /vocabulary_suggestions: WritingVocabularySuggestion\[\];/);
});

test("writing loading screen gives rubric checks more room and reserves the final step", () => {
  const filename = path.join(
    __dirname,
    "../app/(app)/writing/submissions/[submissionId]/result/result-client.tsx",
  );
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /const GRADING_STEP_DELAYS_MS = \[7000, 7000, 6500, 6500, 6000\]/);
  assert.match(source, /if \(activeStep >= GRADING_STEPS\.length - 1\) return;/);
  assert.match(source, /activeStep >= GRADING_STEPS\.length - 2 && stage !== "loading_result"/);
});
