const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("latest tests section separates its heading from the filter and test panel", () => {
  const filename = path.join(__dirname, "../app/(app)/tests/latest-tests-panel.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /<section id="latest-tests" className="scroll-mt-24 space-y-4">/);
  assert.match(source, /<h2 className="text-xl font-bold[^>]*>Latest Tests<\/h2>\s*<div className="overflow-hidden/);
});
