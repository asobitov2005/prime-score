const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("sidebar uses semantic active styling and no unused tests-submenu state", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /active\s*\?\s*"bg-accent text-primary"/);
  assert.doesNotMatch(source, /isTestsSubmenuOpen|setIsTestsSubmenuOpen/);
});
