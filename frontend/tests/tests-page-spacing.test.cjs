const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("tests page keeps vertical gap between sticky filters and test cards", () => {
  const filename = path.join(__dirname, "../app/(app)/tests/page.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(
    source,
    /\{\/\*\s*Test Grid area\s*\*\/\}\s*<div className="[^"]*\bpt-4\b[^"]*"/
  );
});
