const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadQuickTestsModule() {
  const filename = path.join(__dirname, "../app/(app)/dashboard/quick-tests.ts");
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

test("quick tests prefer published tests the user has not attempted yet", () => {
  const { pickQuickTests } = loadQuickTestsModule();
  const tests = [
    { id: "t1", title: "One", status: "published" },
    { id: "t2", title: "Two", status: "published" },
    { id: "t3", title: "Three", status: "published" },
    { id: "t4", title: "Four", status: "published" },
  ];

  const picks = pickQuickTests(tests, new Set(["t1", "t2"]), 3, () => 0);

  assert.equal(picks.length, 3);
  assert.deepEqual(
    picks.slice(0, 2).map((item) => item.id).sort(),
    ["t3", "t4"],
  );
  assert.ok(["t1", "t2"].includes(picks[2].id));
});
