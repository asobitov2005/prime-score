const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("app sidebar uses tighter item spacing", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /<nav className="space-y-0\.5">/);
  assert.match(source, /rounded-lg px-3 py-2 pr-11 text-sm font-semibold transition-all duration-200/);
  assert.match(source, /rounded-lg px-2\.5 py-2 text-sm font-semibold transition-all/);
  assert.match(source, /<span className="whitespace-nowrap text-\[13px\]">\{sourceItem\.label\}<\/span>/);
});
