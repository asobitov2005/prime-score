const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("dashboard metric values avoid extra-bold number styling", () => {
  const dashboardPage = fs.readFileSync(path.join(__dirname, "../app/(app)/dashboard/page.tsx"), "utf8");
  const averages = fs.readFileSync(path.join(__dirname, "../app/(app)/dashboard/dashboard-average-cards.tsx"), "utf8");

  assert.match(dashboardPage, /text-2xl font-semibold tracking-tight text-foreground/);
  assert.doesNotMatch(dashboardPage, /text-2xl font-black tracking-tight text-foreground/);

  assert.match(averages, /text-5xl font-semibold tracking-tight leading-none/);
  assert.doesNotMatch(averages, /text-\[1\.75rem\] md:text-3xl font-black text-foreground tracking-tighter/);
});
