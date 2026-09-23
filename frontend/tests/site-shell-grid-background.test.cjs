const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("site shell uses shared semantic theme colors without an unused grid layer", () => {
  const filename = path.join(__dirname, "../components/layout/site-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /min-h-screen[^\"]*bg-background[^\"]*text-foreground/);
  assert.doesNotMatch(source, /bg-grid/);
});
