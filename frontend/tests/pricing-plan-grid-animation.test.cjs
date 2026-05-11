const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("pricing plan grid supports optional in-view reveal wrappers", () => {
  const filename = path.join(__dirname, "../components/marketing/pricing-plan-grid.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /animateInView\?: boolean;/);
  assert.match(source, /animateInView = false,/);
  assert.match(source, /const revealViewport = \{ once: true, amount: 0\.42 \} as const;/);
  assert.match(source, /function getPricingRevealTransform\(index: number\)/);
  assert.match(source, /initial=\{\{ opacity: 0, scale: 0\.9, \.\.\.revealFrom \}\}/);
  assert.match(source, /whileInView=\{\{ opacity: 1, x: 0, y: 0, rotate: 0, scale: 1 \}\}/);
  assert.ok(!source.includes("delay: index * 0.08"));
});
