const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("desktop sidebar keeps the premium card fixed under a scrollable nav area", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /top: "calc\(var\(--app-shell-sticky-top, 5rem\) \+ 0\.5rem\)"/);
  assert.match(source, /className="flex flex-col gap-4"/);
  assert.match(source, /"calc\(100dvh - var\(--app-shell-sticky-top, 5rem\) - 1\.5rem\)"/);
  assert.match(source, /isTestsSubmenuOpen \? "overflow-y-auto sidebar-scrollbar" : "overflow-y-hidden"/);
  assert.match(source, /maxHeight: "calc\(100dvh - var\(--app-shell-sticky-top, 5rem\) - 11\.5rem\)"/);
  assert.match(source, /<SidebarNavigation \/>/);
  assert.match(source, /<SidebarPremiumCard \/>/);
});
