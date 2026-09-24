const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("mock sessions have a dedicated app page and sidebar destination", () => {
  const page = read("app/(app)/mock/page.tsx");
  const dashboard = read("app/(app)/dashboard/page.tsx");
  const sidebar = read("components/layout/app-shell.tsx");
  const landing = read("components/marketing/landing-page.tsx");
  const picker = read("components/marketing/mock-sessions.tsx");

  assert.match(page, /getLandingFeaturedTests/);
  assert.match(page, /<MockSessions tests=\{tests\} initialMode=\{initialMode\}/);
  assert.doesNotMatch(dashboard, /<MockSessions/);
  assert.match(sidebar, /href: "\/mock", label: "Mock"/);
  assert.match(sidebar, /window\.location\.pathname.*window\.location\.search.*window\.location\.hash/);
  assert.match(sidebar, /buildLoginHref\(returnUrl\)/);
  assert.match(landing, /href="\/mock\?mode=online"/);
  assert.match(landing, /href="\/mock\?mode=offline"/);
  assert.match(picker, /aria-label="Mock session type"/);
  assert.match(picker, /aria-pressed=\{mode === "online"\}/);
  assert.match(picker, /aria-pressed=\{mode === "offline"\}/);
  assert.match(picker, /if \(!hasHydrated \|\| !isAuthenticated\) return/);
  assert.match(picker, /fetch\("\/api\/mock\/bookings\/me"/);
  assert.match(picker, /if \(!initialMode && !hasSelectedMode\.current\)/);
  assert.match(picker, /response\.status === 201/);
});

test("mock tabs retain their mode in the URL and block stale reservations during loading", () => {
  const picker = read("components/marketing/mock-sessions.tsx");
  assert.match(picker, /url\.searchParams\.set\("mode", nextMode\)/);
  assert.match(picker, /router\.replace\(.+scroll: false/);
  assert.match(picker, /selectMode\("online"\)/);
  assert.match(picker, /selectMode\("offline"\)/);
  assert.match(picker, /disabled=\{isLoading \|\| isBooking/);
});

test("offline reservation explains Click payment and links the receipt to support", () => {
  const picker = read("components/marketing/mock-sessions.tsx");

  assert.match(picker, /Click/);
  assert.match(picker, /t\.me\/TheBug[Cc]reator/i);
  assert.match(picker, /receipt|screenshot/i);
  assert.doesNotMatch(picker, /No payment is collected yet/);
});
