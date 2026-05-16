const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("pricing plan grid supports optional in-view reveal wrappers", () => {
  const filename = path.join(__dirname, "../components/marketing/pricing-plan-grid.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /animateInView\?: boolean;/);
  assert.match(source, /animateInView = false,/);
  assert.match(source, /function AnimatedItem\(/);
  assert.match(source, /useInView\(\{ threshold: 0\.1 \}\)/);
  assert.match(source, /inView \? "opacity-100 translate-y-0 translate-x-0 scale-100" : "opacity-0 translate-y-12 scale-\[0\.95\]"/);
  assert.match(source, /style=\{\{ transitionDelay: `\$\{index \* 150\}ms` \}\}/);
  assert.ok(!source.includes("delay: index * 0.08"));
});
