const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadWritingApi() {
  const filename = path.join(__dirname, "../lib/writing-api.ts");
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
  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === "@/lib/auth") {
      return { fetchAdminApi: async () => { throw new Error("not implemented"); } };
    }
    if (request === "@/lib/public-api") {
      return { ADMIN_PUBLIC_API_BASE_URL: "http://localhost:8000/api/admin" };
    }
    return originalLoad(request, parent, isMain);
  };
  mod._compile(compiled, filename);
  Module._load = originalLoad;
  return mod.exports;
}

test("task 2 subtype options include direct question", () => {
  const writingApi = loadWritingApi();
  const values = writingApi.QUESTION_SUBTYPES_TASK2.map((item) => item.value);
  const labels = writingApi.QUESTION_SUBTYPES_TASK2.map((item) => item.label);

  assert.ok(values.includes("direct_question"));
  assert.ok(labels.includes("Direct Question"));
});
