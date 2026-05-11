const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("subscription workspace keeps card copying only on the active invoice and hides completed history rows", () => {
  const filename = path.join(__dirname, "../components/subscription/subscription-workspace.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /Copy card/);
  assert.match(source, /item\.status !== "completed" && item\.id !== activePayment\?\.id/);
  assert.match(source, /No recent archived invoices\./);
  assert.doesNotMatch(source, /onClick=\{\(\) => void handleCopyField\(payment\.id, "card", payment\.cardNumber \?\? "-"\)\}/);
  assert.doesNotMatch(source, /Active until \{payment\.grantedUntil \? formatDateTime\(payment\.grantedUntil\) : "-"\}/);
});
