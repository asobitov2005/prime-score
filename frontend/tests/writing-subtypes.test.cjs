const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadServerWritingModule() {
  const filename = path.join(__dirname, "../lib/server-writing.ts");
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
    if (request === "@/lib/api-base") {
      return {
        FRONTEND_API_TIMEOUT_MS: 15000,
        getFrontendServerApiBaseUrl: () => "http://localhost:8000/api",
      };
    }
    if (request === "@/lib/server-user-auth") {
      return { requestServerUserApi: async () => { throw new Error("not implemented"); } };
    }
    return originalLoad(request, parent, isMain);
  };
  mod._compile(compiled, filename);
  Module._load = originalLoad;
  return mod.exports;
}

test("public writing task 2 subtype options include direct question", () => {
  const serverWriting = loadServerWritingModule();
  const values = serverWriting.QUESTION_SUBTYPES_TASK2.map((item) => item.value);
  const labels = serverWriting.QUESTION_SUBTYPES_TASK2.map((item) => item.label);

  assert.ok(values.includes("direct_question"));
  assert.ok(labels.includes("Direct Question"));
});
