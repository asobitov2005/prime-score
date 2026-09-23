const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("recent activity writing title truncates within a shrinking flex row", () => {
  const filename = path.join(__dirname, "../app/(app)/dashboard/page.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /className="min-w-0 flex-1"/);
  assert.match(source, /className="truncate text-sm font-medium text-foreground">\{entry\.submission\.task_title\}/);
});
