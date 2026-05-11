const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");
const { pathToFileURL } = require("node:url");

async function loadNextConfig(env) {
  const filename = path.join(__dirname, "../next.config.mjs");
  const previous = {
    ADMIN_API_INTERNAL_BASE_URL: process.env.ADMIN_API_INTERNAL_BASE_URL,
    NEXT_PUBLIC_ADMIN_API_BASE_URL: process.env.NEXT_PUBLIC_ADMIN_API_BASE_URL,
  };

  for (const [key, value] of Object.entries(env)) {
    if (value == null) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    const moduleUrl = `${pathToFileURL(filename).href}?cacheBust=${Date.now()}-${Math.random()}`;
    const mod = await import(moduleUrl);
    return mod.default;
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value == null) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("rewrites remap broken docker admin api aliases to the host bridge", async () => {
  const config = await loadNextConfig({
    ADMIN_API_INTERNAL_BASE_URL: "http://api:8000/api/admin",
    NEXT_PUBLIC_ADMIN_API_BASE_URL: "/api/admin",
  });

  const rewrites = await config.rewrites();
  assert.equal(rewrites[1].destination, "http://172.17.0.1:8000/api/admin/:path*");
});
