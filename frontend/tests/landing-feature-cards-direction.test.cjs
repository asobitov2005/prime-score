const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing feature cards alternate from left and right walls with quick stagger", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-page-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /function getFeatureCardReveal\(index: number\)/);
  assert.match(source, /const direction = index % 2 === 0 \? -220 : 220;/);
  assert.match(source, /initial=\{\{[\s\S]*opacity: 0,[\s\S]*x: getFeatureCardReveal\(i\)\.x,[\s\S]*y: getFeatureCardReveal\(i\)\.y,[\s\S]*scale: 0\.94[\s\S]*\}\}/);
  assert.match(source, /whileInView=\{\{[\s\S]*opacity: 1,[\s\S]*x: 0,[\s\S]*y: 0,[\s\S]*scale: 1[\s\S]*\}\}/);
  assert.match(source, /delay: i \* 0\.07/);
});
