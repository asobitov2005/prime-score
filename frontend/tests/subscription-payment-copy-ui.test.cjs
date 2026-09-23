const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("subscription workspace exposes copy controls only for the active invoice", () => {
  const filename = path.join(__dirname, "../components/subscription/subscription-workspace.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /navigator\.clipboard\.writeText/);
  assert.match(source, /Copy card/);
  assert.match(source, /payments\.find\(\(item\) => item\.status === "pending" \|\| item\.status === "matched"\)/);
  assert.match(source, /<ActiveInvoiceModal\s+payment=\{activePayment\}[\s\S]*?onCopy=\{handleCopyField\}/);
  assert.doesNotMatch(source, /payments\.map\(/);
});
