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
  assert.match(source, /className="bg-card\/35 lg:h-\[min\(28rem,calc\(100dvh-var\(--app-shell-sticky-top,5rem\)-15\.75rem\)\)\]"/);
});
