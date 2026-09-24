const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("desktop sidebar keeps navigation scrollable and premium card outside its scroll area", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");
  const asideStart = source.indexOf("<aside className={cn(");
  const asideEnd = source.indexOf("</aside>", asideStart);
  const desktopAside = source.slice(asideStart, asideEnd);
  const scrollAreaEnd = desktopAside.indexOf("</div>", desktopAside.indexOf("overflow-y-auto"));
  const premiumCard = desktopAside.indexOf("<SidebarPremiumCard />");

  assert.notEqual(asideStart, -1);
  assert.notEqual(asideEnd, -1);
  assert.match(desktopAside, /flex-1 min-h-0[^\"]*overflow-y-auto/);
  assert.ok(scrollAreaEnd > 0 && premiumCard > scrollAreaEnd);
  assert.match(desktopAside, /\{sidebarNavigation\}/);
});
