const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("landing hero and featured tests keep the interactive exam desk surface", () => {
  const filename = path.join(__dirname, "../components/marketing/landing-page-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /<ScrollReveal className="relative z-10 w-full grid/);
  assert.match(source, /Free IELTS Mock Tests Online/);
  assert.match(source, /Master Your IELTS/);
  assert.match(source, /\["All", "Reading", "Listening"\]\.map/);
  assert.match(source, /displayedTests\.length > 0 \? displayedTests\.map/);
  assert.match(source, /<EmptyState[\s\S]*title=\{activeTab === "All" \? "No tests found"/);
});
