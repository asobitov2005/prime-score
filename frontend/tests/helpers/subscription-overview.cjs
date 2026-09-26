const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../../components/subscription/subscription-overview.tsx");
const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
}).outputText;
const component = new Module(filename, module);
component.filename = filename;
component.paths = Module._nodeModulePaths(path.dirname(filename));
const originalRequire = component.require.bind(component);
component.require = (name) => name.endsWith(".module.css")
  ? { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) }
  : originalRequire(name);
component._compile(compiled, filename);
module.exports = component.exports;
