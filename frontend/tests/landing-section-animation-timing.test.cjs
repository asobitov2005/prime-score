const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing CSS avoids continuous animations and expensive compositing", () => {
  const filename = path.join(__dirname, "../components/marketing/landing.module.css");
  const source = fs.readFileSync(filename, "utf8");

  assert.doesNotMatch(source, /infinite|will-change|backdrop-filter/);
  assert.match(source, /prefers-reduced-motion:\s*reduce/);
  assert.match(source, /focus-visible/);
  assert.match(source, /\.mobileNav:not\(\[hidden\]\)/);
  assert.match(source, /animation:\s*none !important/);
  assert.match(source, /@keyframes inkWrite/);
  assert.match(source, /@keyframes paperArrival/);
  assert.doesNotMatch(source, /\[data-landing-reveal\][^{]*\{[^}]*opacity:\s*0\s*;/);
});

test("landing keeps app shell lazy and displays matching FAQ content", () => {
  const shell = fs.readFileSync(path.join(__dirname, "../components/layout/route-shell.tsx"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../components/marketing/landing-page.tsx"), "utf8");
  assert.match(shell, /dynamic\(/);
  assert.match(shell, /pathname === "\/"/);
  assert.match(page, /landingFaqs\.map/);
  assert.match(page, /<details/);
  assert.match(page, /id="faq"/);
});
