const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("recent activity writing title has an explicit width clamp", () => {
  const filename = path.join(__dirname, "../app/(app)/dashboard/page.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /max-w-full.*line-clamp-2 font-bold text-foreground text-\[15px\].*sm:max-w-\[170px\].*sm:line-clamp-1.*lg:max-w-\[210px\]/s);
});
