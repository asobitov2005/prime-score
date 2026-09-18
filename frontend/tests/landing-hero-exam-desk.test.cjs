const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("practice desk labels its illustration and offers accessible evidence feedback", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-sample.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /Illustrative question\. No score is saved\./);
  assert.match(source, /aria-pressed=\{answer === option\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /<mark data-revealed=\{answer !== null\}/);
  assert.match(source, /setAnswer\(null\)/);
  assert.doesNotMatch(source, /fetch\(|createApiClient|setInterval/);
});
