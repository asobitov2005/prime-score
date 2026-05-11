const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("site shell grid background is fixed to the viewport", () => {
  const filename = path.join(__dirname, "../components/layout/site-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /className="fixed inset-0 z-0 bg-grid pointer-events-none"/);
});
