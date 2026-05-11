const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadAuthModule() {
  const filename = path.join(__dirname, "../lib/auth.ts");
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

function token(payload) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.signature`;
}

test("detects expired admin access tokens", () => {
  const auth = loadAuthModule();

  const expired = token({ scope: "admin", sub: "admin-1", exp: 100 });
  const active = token({ scope: "admin", sub: "admin-1", exp: 200 });

  assert.equal(auth.isAdminAccessTokenExpired(expired, 100_000), true);
  assert.equal(auth.isAdminAccessTokenExpired(active, 100_000), false);
});

test("treats missing, malformed, or non-admin access tokens as expired", () => {
  const auth = loadAuthModule();

  assert.equal(auth.isAdminAccessTokenExpired(null, 100_000), true);
  assert.equal(auth.isAdminAccessTokenExpired("bad-token", 100_000), true);
  assert.equal(auth.isAdminAccessTokenExpired(token({ scope: "user", sub: "u1", exp: 200 }), 100_000), true);
});

test("classifies backend auth failures", () => {
  const auth = loadAuthModule();

  assert.equal(auth.isAdminAuthFailureStatus(401), true);
  assert.equal(auth.isAdminAuthFailureStatus(403), true);
  assert.equal(auth.isAdminAuthFailureStatus(400), false);
  assert.equal(auth.isAdminAuthFailureStatus(500), false);
});
