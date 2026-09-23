const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadNavigationModule() {
  const filename = path.join(__dirname, "../lib/subscription-navigation.ts");
  const source = fs.readFileSync(filename, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loaded = new Module(filename, module);
  loaded.filename = filename;
  loaded.paths = Module._nodeModulePaths(path.dirname(filename));
  loaded._compile(compiled, filename);
  return loaded.exports;
}

test("return URL rejects backslash-based external redirects", () => {
  const { resolveSafeReturnUrl } = loadNavigationModule();

  assert.equal(resolveSafeReturnUrl("/\\attacker.example"), "/dashboard");
  assert.equal(resolveSafeReturnUrl("//attacker.example"), "/dashboard");
});

test("return URL preserves a safe relative path, query, and hash", () => {
  const { resolveSafeReturnUrl } = loadNavigationModule();

  assert.equal(
    resolveSafeReturnUrl("/?mockBooking=11111111-1111-4111-8111-111111111111#mock"),
    "/?mockBooking=11111111-1111-4111-8111-111111111111#mock",
  );
});
