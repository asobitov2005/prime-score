const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadDashboardMetrics() {
  const filename = path.join(__dirname, "../app/(app)/dashboard/dashboard-metrics.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod._compile(compiled, filename);
  return mod.exports;
}

test("study time uses Tashkent calendar week and calendar months", () => {
  const { summarizeStudyTime } = loadDashboardMetrics();
  const result = summarizeStudyTime(
    [
      { activityDate: "2025-12-28", timeSpentSec: 3600 },
      { activityDate: "2025-12-29", timeSpentSec: 7200 },
      { activityDate: "2025-12-31", timeSpentSec: 3600 },
      { activityDate: "2026-01-01", timeSpentSec: 1800 },
    ],
    new Date("2026-01-01T01:00:00Z"),
    "Asia/Tashkent",
  );

  assert.equal(result.thisWeekHours, 3.5);
  assert.equal(result.totalHours, 4.5);
  assert.equal(result.previousWeekHours, 1);
  assert.equal(result.thisMonthHours, 0.5);
  assert.equal(result.previousMonthHours, 4);
  assert.deepEqual(result.monthlyData.slice(-2).map(({ month, hours }) => ({ month, hours })), [
    { month: "Dec", hours: 4 },
    { month: "Jan", hours: 0.5 },
  ]);
});

test("average skill band includes Speaking when it has a score", () => {
  const { getAverageSkillBand } = loadDashboardMetrics();
  assert.equal(getAverageSkillBand([7, 6.5, 7.5, 8]), 7.25);
  assert.equal(getAverageSkillBand([7, null, 9, null]), 8);
  assert.equal(getAverageSkillBand([null, null]), null);
});
