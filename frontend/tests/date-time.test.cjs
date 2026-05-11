const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadDateTimeModule() {
  const filename = path.join(__dirname, "../lib/date-time.ts");
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

test("formats attempt timestamps in Asia/Tashkent regardless of server timezone", () => {
  const dateTime = loadDateTimeModule();
  const completedAt = "2026-05-10T01:12:00Z";

  assert.equal(dateTime.APP_TIME_ZONE, "Asia/Tashkent");
  assert.equal(dateTime.formatDateTime(completedAt), "10 May 2026, 06:12");
  assert.equal(dateTime.formatCompletedAtLabel(completedAt), "Completed on May 10, 2026 at 06:12");
});
