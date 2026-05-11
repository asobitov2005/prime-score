const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("tests submenu active item uses unified primary highlight styling", () => {
  const filename = path.join(__dirname, "../components/layout/app-shell.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(
    source,
    /isSourceActive\s*\?\s*"border border-primary\/25 bg-primary\/10 text-primary shadow-sm"/
  );
  assert.match(
    source,
    /isSourceActive \? "bg-primary\/15 text-primary" : "bg-muted\/80"/
  );
  assert.match(
    source,
    /isSourceActive &&\s*<span className="absolute inset-y-1\.5 left-0 w-1 rounded-full bg-primary\/80" \/>/
  );
});
