const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app sidebar uses compact, touch-sized navigation rows", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /<nav className="space-y-1">/);
  assert.match(source, /min-h-10 items-center gap-3 rounded-xl px-3 py-2\.5 text-sm font-semibold/);
});
