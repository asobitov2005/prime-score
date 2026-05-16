const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing lower sections use shared CSS in-view timing", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-page-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /function ScrollReveal\(/);
  assert.match(source, /useInView\(\{ threshold: 0\.1 \}\)/);
  assert.ok(!source.includes('viewport={{ once: true, margin: "-50px" }}'));
  assert.match(source, /transition-all duration-1000 ease-out/);
  assert.match(source, /<ScrollReveal id="pricing"/);
  assert.match(source, /<PricingPlanGrid plans=\{plans\} compact \/>/);
});
