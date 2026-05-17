const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("user auth helpers treat only 401 as an expired session", () => {
  const clientAuth = read("lib/user-auth-client.ts");
  const serverAuth = read("lib/server-user-auth.ts");
  const redeemPanel = read("components/subscription/redeem-code-panel.tsx");

  assert.match(clientAuth, /return status === 401;/);
  assert.doesNotMatch(clientAuth, /status === 403/);

  assert.match(serverAuth, /return status === 401;/);
  assert.doesNotMatch(serverAuth, /status === 403/);

  assert.match(redeemPanel, /setErrorMessage\(error instanceof ApiError \? error\.message : "Redeem code could not be applied\."\);/);
});
