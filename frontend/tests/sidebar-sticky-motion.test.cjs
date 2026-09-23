const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("desktop sidebar stays fixed without a sticky scroll wrapper", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /"hidden lg:fixed lg:inset-y-0 lg:left-0/);
  assert.doesNotMatch(source, /lg:sticky/);
});
