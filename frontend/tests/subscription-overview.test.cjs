const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { SubscriptionOverview, SubscriptionPaymentGuide } = require("./helpers/subscription-overview.cjs");

const plan = { id: "plan-1", title: "1 Month", durationDays: 30, priceLabel: "5 000 sum", monthlyLabel: "", perks: ["Gift 3 premium days to a friend"], isFeatured: true, badgeLabel: "Most Popular" };
const props = { plans: [plan], busyPlanId: null, onChoosePlan: () => {}, isPremium: true, premiumUntil: "2027-09-25T00:00:00Z" };
const render = (override = {}) => renderToStaticMarkup(React.createElement(SubscriptionOverview, { ...props, ...override }));

test("subscription renders backend prices, terms and current expiry without popularity claims", () => {
  const html = render();
  for (const text of ["5 000 sum", "30 days of access", "Gift 3 premium days", "25 Sept 2027", "Pay with Click", "No automatic renewal"]) assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Most Popular|Speaking|07 Jul 2026/);
});

test("subscription handles missing and invalid expiry without inventing dates", () => {
  for (const premiumUntil of [null, "invalid"]) {
    assert.match(render({ premiumUntil }), /Your Premium access is active/);
  }
  assert.match(render({ isPremium: false }), /Free plan/);
});

test("unavailable plans keep the existing membership status and show an honest empty state", () => {
  const html = render({ plans: [] });
  assert.match(html, /Plans are temporarily unavailable/);
  assert.match(html, /Premium/);
  assert.doesNotMatch(html, /<button/);
});

function buttons(node) {
  if (!node || typeof node !== "object") return [];
  if (node.type === "button") return [node];
  return React.Children.toArray(node.props?.children).flatMap(buttons);
}

test("Click buttons use the selected real plan and prevent concurrent invoice creation", () => {
  let selected;
  const idle = buttons(SubscriptionOverview({ ...props, onChoosePlan: (value) => { selected = value; } }));
  idle[0].props.onClick();
  assert.equal(selected, plan);
  const pending = buttons(SubscriptionOverview({ ...props, plans: [plan, { ...plan, id: "plan-2" }], busyPlanId: plan.id }));
  assert.ok(pending.every((button) => button.props.disabled));
  assert.equal(pending[0].props["aria-busy"], true);
  assert.equal(pending[1].props["aria-busy"], false);
});

test("payment guide describes automatic confirmation and troubleshooting only", () => {
  const html = renderToStaticMarkup(React.createElement(SubscriptionPaymentGuide));
  assert.match(html, /automatically after Click confirms payment/);
  assert.match(html, /Payment or activation problem/);
  assert.doesNotMatch(html, /Send screenshot/);
});

test("subscription surfaces share the site palette without colored panel gradients", () => {
  const base = path.join(__dirname, "../components/subscription");
  const css = fs.readFileSync(path.join(base, "subscription.module.css"), "utf8");
  assert.match(css, /hsl\(var\(--card\)\)/);
  assert.match(css, /prefers-reduced-motion/);
  for (const name of ["subscription-overview.tsx", "subscription-workspace.tsx", "gift-code-generator-card.tsx"]) {
    assert.doesNotMatch(fs.readFileSync(path.join(base, name), "utf8"), /dark:bg-slate|bg-\[linear-gradient|shadow-\[|Speaking Mock with AI Examiner/);
  }
});
