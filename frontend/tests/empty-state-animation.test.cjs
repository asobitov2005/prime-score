const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("empty state uses the shared Lottie animation asset", () => {
  const source = read("components/ui/empty-state.tsx");

  assert.match(source, /@lottiefiles\/dotlottie-react/);
  assert.match(source, /\/animations\/empty-state\.lottie/);
  assert.ok(fs.existsSync(path.join(root, "public/animations/empty-state.lottie")));
  assert.ok(fs.existsSync(path.join(root, "public/animations/empty-state.json")));
});

test("public catalog does not fall back to mock tests when backend data is unavailable", () => {
  const source = read("lib/server-data.ts");

  assert.doesNotMatch(source, /mockTests/);
  assert.match(source, /export async function getCatalogTests/);
  assert.match(source, /export async function getLandingFeaturedTests/);
});

test("app sidebar keeps IELTS Mock disabled until the page is ready", () => {
  const source = read("components/layout/app-shell.tsx");

  assert.match(source, /label: "IELTS Mock"[^}]+soon: true/s);
});
