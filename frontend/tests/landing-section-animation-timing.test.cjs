const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing lower sections use shared in-view timing instead of late margin triggers", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-page-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /const sectionViewport = \{ once: true, amount: 0\.32 \} as const;/);
  assert.ok(!source.includes('viewport={{ once: true, margin: "-50px" }}'));
  assert.match(source, /<motion\.h2[\s\S]*viewport=\{sectionViewport\}/);
  assert.match(source, /<motion\.p[\s\S]*viewport=\{sectionViewport\}/);
  assert.match(source, /<PricingPlanGrid plans=\{plans\} compact animateInView \/>/);
});
