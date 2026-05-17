const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("site shell refreshes premium state from session status instead of expiring it locally", () => {
  const siteShell = read("components/layout/site-shell.tsx");

  assert.match(siteShell, /if \(!hasHydrated \|\| !isAuthenticated \|\| !sessionId\) \{/);
  assert.match(siteShell, /const syncSessionStatus = async \(\) => \{/);
  assert.match(siteShell, /window\.addEventListener\("focus", handleVisibilityOrFocus\);/);
  assert.match(siteShell, /document\.addEventListener\("visibilitychange", handleVisibilityOrFocus\);/);
  assert.match(siteShell, /const intervalId = window\.setInterval\(\(\) => \{/);
  assert.match(siteShell, /if \(error instanceof ApiError && error\.status === 401\) \{/);
  assert.doesNotMatch(siteShell, /setTimeout\(expirePremium/);
});
