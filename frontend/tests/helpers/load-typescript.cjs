const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../..");
const cache = new Map();

function loadTypeScript(relativePath) {
  const filename = path.resolve(root, relativePath);
  if (cache.has(filename)) return cache.get(filename).exports;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  cache.set(filename, mod);
  const originalRequire = mod.require.bind(mod);
  mod.require = (request) => {
    if (request.startsWith("@/")) {
      const base = path.join(root, request.slice(2));
      const resolved = [base + ".ts", base + ".tsx"].find(fs.existsSync);
      if (resolved) return loadTypeScript(resolved);
    }
    return originalRequire(request);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText, filename);
  return mod.exports;
}
module.exports = { loadTypeScript };
