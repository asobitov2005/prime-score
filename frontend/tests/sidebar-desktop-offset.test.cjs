const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("desktop app shell uses a fixed desktop sidebar aligned to the centered content gutter", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(
    source,
    /<aside className=\{cn\(\s*"relative hidden lg:block w-\[17rem\] shrink-0"/
  );
  assert.match(source, /left: "calc\(\(100vw - min\(100vw, 82rem\)\) \/ 2 \+ 1\.5rem\)"/);
});
