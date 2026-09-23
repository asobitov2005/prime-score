const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("tests page uses the shared wide content container and responsive skill cards", () => {
  const filename = path.join(__dirname, "../app/(app)/tests/page.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /max-w-\[82rem\]/);
  assert.match(source, /grid-cols-\[repeat\(auto-fit,minmax\(min\(100%,12\.5rem\),1fr\)\)\] gap-4/);
});
