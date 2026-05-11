const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("desktop sidebar uses a fixed panel instead of a sticky wrapper", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.doesNotMatch(
    source,
    /hidden lg:block w-\[17rem\] shrink-0 transition-all duration-300 sticky/
  );
  assert.match(
    source,
    /className="fixed z-30 pointer-events-auto"/
  );
});
