const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("subscription upgrade navigation routes guests through login and members to subscription", () => {
  const helper = read("lib/subscription-navigation.ts");
  const pricingGrid = read("components/marketing/pricing-plan-grid.tsx");
  const startTestModal = read("components/start-test-modal.tsx");

  assert.match(helper, /export const SUBSCRIPTION_PATH = "\/subscription";/);
  assert.match(helper, /return `\/login\?returnUrl=\$\{encodeURIComponent\(safeReturnUrl\)\}`;/);
  assert.match(helper, /return isAuthenticated \? SUBSCRIPTION_PATH : buildLoginHref\(SUBSCRIPTION_PATH\);/);

  assert.match(pricingGrid, /const subscriptionHref = mounted \? getSubscriptionPageHref\(isAuthenticated\) : getSubscriptionPageHref\(false\);/);
  assert.match(pricingGrid, /href: subscriptionHref,\s+label: "Login to upgrade"/s);
  assert.match(pricingGrid, /href: subscriptionHref,\s+label: "Upgrade now"/s);

  assert.match(startTestModal, /const subscriptionHref = getSubscriptionPageHref\(isAuthenticated\);/);
  assert.match(startTestModal, /<Link href=\{subscriptionHref\}>/);
  assert.doesNotMatch(startTestModal, /<Link href="\/pricing">/);
});
