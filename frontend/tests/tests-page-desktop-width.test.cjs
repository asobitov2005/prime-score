const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("tests page expands desktop content width and card columns", () => {
  const filename = path.join(__dirname, "../app/(app)/tests/page.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /<div className="flex flex-col max-w-6xl mx-auto animate-in fade-in duration-500"/);
  assert.match(source, /<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"/);
});
