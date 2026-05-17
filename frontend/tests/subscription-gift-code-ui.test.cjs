const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(path.join(__dirname, "..", relativePath), "utf8");
}

test("subscription gift generator card exposes manual code generation flow", () => {
  const workspace = read("components/subscription/subscription-workspace.tsx");
  const card = read("components/subscription/gift-code-generator-card.tsx");
  const apiClient = read("lib/api/client.ts");

  assert.match(workspace, /<GiftCodeGeneratorCard initialSummary=\{initialGiftSummary\} \/>/);
  assert.match(card, /Generate code/);
  assert.match(card, /Each code works once, expires in 3 days, and cannot be redeemed on your own account\./);
  assert.match(card, /Eligible premium plans unlock friend gift credits here after premium is activated\./);
  assert.match(card, /api\.generateGiftCode\(\{ gift_days: giftDays \}\)/);
  assert.match(card, /Copy code/);
  assert.match(apiClient, /listGiftCodes: \(\) => request<GiftCodeSummaryResponse>\("\/me\/gift-codes"/);
  assert.match(apiClient, /generateGiftCode: \(body: GenerateGiftCodeBody\) => request<GenerateGiftCodeResponse>\("\/me\/gift-codes\/generate"/);
});
