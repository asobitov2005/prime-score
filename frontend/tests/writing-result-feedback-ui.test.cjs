const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("writing result keeps honest feedback without the roast toggle shell", () => {
  const filename = path.join(__dirname, "../app/(app)/writing/submissions/[submissionId]/result/result-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.match(source, /function FeedbackPanel/);
  assert.match(source, /<CardTitle className="text-lg">Roast feedback<\/CardTitle>/);
  assert.match(source, /Savage mode/);
  assert.match(source, /plain-English feedback/);
  assert.doesNotMatch(source, /Fun feedback/);
  assert.doesNotMatch(source, /Hide roast|Show roast/);
});

test("writing result hides revision apply and regrade controls", () => {
  const filename = path.join(__dirname, "../app/(app)/writing/submissions/[submissionId]/result/result-client.tsx");
  const source = fs.readFileSync(filename, "utf8");

  assert.doesNotMatch(source, /Regrade revision/);
  assert.doesNotMatch(source, /Apply fixes/);
  assert.doesNotMatch(source, /Use improved/);
  assert.doesNotMatch(source, /submitWritingSubmission/);
  assert.doesNotMatch(source, /onApply/);
});
