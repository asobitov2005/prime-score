const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadCustomTaskConfigModule() {
  const filename = path.join(__dirname, "../app/(app)/writing/custom-task-config.ts");
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

test("task 2 custom writing config opens a private workspace draft", () => {
  const customTaskConfig = loadCustomTaskConfigModule();

  assert.equal(customTaskConfig.getCustomTaskDraftKey("task_2"), "writing-exam-draft:custom:task_2");
  assert.equal(customTaskConfig.getCustomTaskWorkspaceHref("task_2"), "/exam-preview/writing?task_type=task_2");
  assert.equal(customTaskConfig.getCustomTaskConfig("task_2").requiresImage, false);
  assert.match(customTaskConfig.getCustomTaskConfig("task_2").title, /Task 2/i);
});
