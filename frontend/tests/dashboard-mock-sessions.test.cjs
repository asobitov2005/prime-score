const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.join(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("dashboard renders the shared online and offline mock selector", () => {
  const page = read("app/(app)/dashboard/page.tsx");
  const picker = read("components/marketing/mock-sessions.tsx");

  assert.match(page, /getLandingFeaturedTests/);
  assert.match(page, /<MockSessions tests=\{mockTests\} variant="dashboard" showBookingFirst \/>/);
  assert.match(picker, /aria-label="Mock session type"/);
  assert.match(picker, /aria-pressed=\{mode === "online"\}/);
  assert.match(picker, /aria-pressed=\{mode === "offline"\}/);
  assert.match(picker, /if \(!showBookingFirst \|\| !hasHydrated \|\| !isAuthenticated\) return/);
  assert.match(picker, /fetch\("\/api\/mock\/bookings\/me"/);
});

test("offline reservation explains Click payment and links the receipt to support", () => {
  const picker = read("components/marketing/mock-sessions.tsx");

  assert.match(picker, /Click/);
  assert.match(picker, /t\.me\/TheBug[Cc]reator/i);
  assert.match(picker, /receipt|screenshot/i);
  assert.doesNotMatch(picker, /No payment is collected yet/);
});
