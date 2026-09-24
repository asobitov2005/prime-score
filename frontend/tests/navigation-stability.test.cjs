const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const read = file => fs.readFileSync(path.join(__dirname, "..", file), "utf8");

test("app navigation leaves the router mounted and preserves sidebar DOM", () => {
  const shell = read("components/layout/app-shell.tsx");
  assert.doesNotMatch(shell, /pendingNavigationHref|setPendingNavigationHref|PRIME_NAVIGATION_START_EVENT/);
  assert.doesNotMatch(shell, /const Sidebar\w+ = \(\) =>/);
  assert.match(shell, /\{sidebarNavigation\}/);
  assert.match(shell, /event\.metaKey \|\| event\.ctrlKey \|\| event\.shiftKey \|\| event\.altKey/);
  assert.match(shell, /document\.body\.style\.overflow = previousOverflow/);
  assert.match(shell, /href=\{item\.href\}\s+prefetch=\{false\}/);
});

test("progress is scoped to the current full URL with timer cleanup", () => {
  const progress = read("components/layout/navigation-transition-overlay.tsx");
  assert.match(progress, /\}, \[currentHref\]\)/);
  assert.match(progress, /window\.clearTimeout\(showTimer\)/);
  assert.match(progress, /window\.clearTimeout\(timeout\)/);
  assert.doesNotMatch(progress, /targetHrefRef|isMounted|FADE_OUT_MS/);
  assert.match(progress, /pointer-events-none/);
});

test("a route error provides recovery inside the app layout", () => {
  const error = read("app/(app)/error.tsx");
  assert.match(error, /role="alert"/);
  assert.match(error, /onClick=\{reset\}/);
  assert.match(error, /href="\/dashboard"/);
});
