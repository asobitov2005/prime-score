const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing feature cards use shared reveal and quick stagger", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-page-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /function ScrollReveal\(/);
  assert.match(source, /useInView\(\{ threshold: 0\.1 \}\)/);
  assert.match(source, /inView \? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"/);
  assert.match(source, /style=\{\{ transitionDelay: `\$\{i \* 100\}ms` \}\}/);
  assert.match(source, /hover:-translate-y-2/);
});
