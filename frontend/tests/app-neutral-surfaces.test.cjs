const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(file) {
  return fs.readFileSync(path.join(__dirname, "..", file), "utf8");
}

test("bookmarks and history use theme surfaces rather than fixed blue or gradient backgrounds", () => {
  const bookmarks = read("app/(app)/bookmarks/bookmarks-client.tsx");
  const history = read("app/(app)/history/history-client.tsx");
  assert.match(bookmarks, /bg-background text-foreground/);
  assert.match(bookmarks, /border-border bg-card/);
  assert.doesNotMatch(bookmarks, /dark:bg-slate|bg-\[#|prime-skeleton-shimmer/);
  assert.doesNotMatch(history, /bg-\[linear-gradient/);
  assert.doesNotMatch(history, /min-w-\[260px\]/);
});
