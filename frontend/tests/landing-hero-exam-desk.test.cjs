const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing hero and featured tests use exam-desk motion variants", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-page-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /const deskBadgeVariants: Variants =/);
  assert.match(source, /const deskPanelVariants: Variants =/);
  assert.match(source, /const deskPaperVariants: Variants =/);
  assert.match(source, /const deskChipVariants: Variants =/);
  assert.match(source, /const deskRowVariants: Variants =/);
  assert.match(source, /<motion\.div[\s\S]*variants=\{deskPanelVariants\}/);
  assert.match(source, /<motion\.div[\s\S]*variants=\{deskPaperVariants\}/);
  assert.match(source, /<motion\.div[\s\S]*variants=\{deskChipVariants\}/);
  assert.match(source, /<motion\.div[\s\S]*variants=\{deskRowVariants\}/);
});
