const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing renders real slug-linked tests without client-only reveal gates", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-page.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.doesNotMatch(source, /["']use client["']/);
  assert.doesNotMatch(source, /ScrollReveal|useInView|opacity-0|setInterval/);
  assert.match(source, /tests\.map\(\(test\)/);
  assert.match(source, /href=\{`\/tests\/\$\{test\.slug\}`\}/);
  assert.match(source, /test\.title/);
  assert.match(source, /test\.questionCount/);
  assert.match(source, /styles\.emptyCatalog/);
});
