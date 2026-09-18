const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("practice desk labels its illustration and offers accessible evidence feedback", () => {
  const filename = path.join(
    __dirname,
    "../components/marketing/landing-sample.tsx",
  );
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /Illustrative question\. No score is saved\./);
  assert.match(source, /aria-pressed=\{answer === option\}/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /<mark data-revealed=\{answer !== null\}/);
  assert.match(source, /setAnswer\(null\)/);
  assert.doesNotMatch(source, /fetch\(|createApiClient|setInterval/);
});

test("the reading note is an explicit accessible action, not hover-only content", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../components/marketing/landing-sample.tsx"),
    "utf8",
  );
  assert.match(source, /aria-pressed=\{showClue\}/);
  assert.match(source, /aria-controls="sample-reading-note"/);
  assert.match(source, /aria-hidden=\{showClue\}/);
  assert.match(source, /aria-hidden=\{!showClue\}/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /Look for the meaning, not just matching words\./);
  assert.doesNotMatch(
    source,
    /onMouseMove|onPointerMove|requestAnimationFrame|setTimeout/,
  );
});

test("the opening paper scene uses finite CSS motion, leaving the headline visible", () => {
  const css = fs.readFileSync(
    path.join(__dirname, "../components/marketing/landing.module.css"),
    "utf8",
  );
  assert.match(css, /@keyframes paperFan/);
  assert.match(css, /--intro-delay: 500ms/);
  assert.match(css, /paperFan 850ms var\(--intro-delay\)/);
  assert.match(css, /@keyframes bookmarkArrival/);
  assert.match(css, /@keyframes stampPress/);
  assert.match(css, /backface-visibility: hidden/);
  assert.match(css, /translate\(var\(--leaf-x\), var\(--leaf-y\)\)/);
  assert.doesNotMatch(css, /animation:[^;]*infinite/);
  assert.doesNotMatch(css, /\.heroCopy h1\s*\{[^}]*opacity:\s*0/);
  assert.doesNotMatch(
    css,
    /\.hero(?:Description|Actions|Note)\s*\{[^}]*animation:/,
  );
});
