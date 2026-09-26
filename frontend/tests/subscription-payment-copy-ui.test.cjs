const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("subscription uses Click and support is only for payment problems", () => {
  const filename = path.join(__dirname, "../components/subscription/subscription-workspace.tsx");
  const source = fs.readFileSync(filename, "utf8") + fs.readFileSync(path.join(__dirname, "../components/subscription/subscription-overview.tsx"), "utf8");

  assert.match(source, /Pay with Click/);
  assert.match(source, /Premium activates automatically after Click confirms payment/);
  assert.match(source, /Payment or activation problem\? Contact/);
  assert.doesNotMatch(source, /Send screenshot|Send receipt|Copy card|PrimeScoreSupport|trackPaymentProofClick/);
  assert.match(source, /payments\.find\(\(item\) => item\.status === "pending" \|\| item\.status === "matched"\)/);
  assert.match(source, /<ActiveInvoiceModal\s+payment=\{activePayment\}/);
  assert.match(source, /contact support before paying again/);
  assert.doesNotMatch(source, /payments\.map\(/);
});

test("landing and pricing FAQs describe automatic Click activation without auto renewal", () => {
  const source = fs.readFileSync(path.join(__dirname, "../lib/seo.ts"), "utf8");
  assert.match(source, /pay securely with Click/);
  assert.match(source, /activates automatically after Click confirms/);
  assert.match(source, /one-time purchases and do not renew automatically/);
  assert.doesNotMatch(source, /card-payment instructions|send your payment screenshot/);
});
