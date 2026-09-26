// Visual smoke test of the real React presentation and site theme, without API/DB writes.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawn } = require("node:child_process");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const postcss = require("postcss");
const tailwind = require("tailwindcss");
const { SubscriptionOverview, SubscriptionPaymentGuide } = require("../helpers/subscription-overview.cjs");
const root = path.resolve(__dirname, "../..");
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "primescore-subscription-design-"));
  const globalCss = await postcss([tailwind(path.join(root, "tailwind.config.ts"))]).process(fs.readFileSync(path.join(root, "app/globals.css"), "utf8"), { from: path.join(root, "app/globals.css") });
  const css = globalCss.css + fs.readFileSync(path.join(root, "components/subscription/subscription.module.css"), "utf8");
  const plans = [30, 60, 90].map((days, i) => ({ id: `visual-${i}`, title: `${i + 1} Month${i ? "s" : ""}`, durationDays: days, priceLabel: ["5 000 sum", "99 000 sum", "119 000 sum"][i], monthlyLabel: i ? ["", "49 500 sum / 30 days", "39 667 sum / 30 days"][i] : "", perks: ["Full access to all IELTS mock tests", `Gift ${[3, 7, 14][i]} premium days to a friend`] }));
  const markup = renderToStaticMarkup(React.createElement("main", { className: "workspace" }, React.createElement(SubscriptionOverview, { plans, busyPlanId: null, onChoosePlan: () => {}, isPremium: true, premiumUntil: "2027-09-25T00:00:00Z" }), React.createElement(SubscriptionPaymentGuide), React.createElement("details", { className: "extras" }, React.createElement("summary", null, "Gift codes & redeem a code"))));
  const server = http.createServer((req, res) => { res.setHeader("Content-Type", "text/html"); res.end(`<!doctype html><html class="${req.url === "/dark" ? "dark" : "light"}"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}body{margin:0;padding:32px 24px}main{max-width:1240px;margin:auto}@media(max-width:640px){body{padding:24px 16px}}</style></head><body>${markup}</body></html>`); });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const profile = path.join(output, "chrome");
  const chrome = spawn("/usr/bin/google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let socket;
  const report = { output, checks: [], runtimeErrors: [] };
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await pause(100);
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    socket = new WebSocket(targets.find((t) => t.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
    let id = 0;
    const pending = new Map();
    const send = (method, params = {}) => new Promise((resolve, reject) => { const key = ++id; pending.set(key, { resolve, reject }); socket.send(JSON.stringify({ id: key, method, params })); });
    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.id) { const task = pending.get(message.id); pending.delete(message.id); message.error ? task.reject(message.error) : task.resolve(message.result); }
      if (message.method === "Runtime.exceptionThrown") report.runtimeErrors.push(message.params.exceptionDetails.text);
    };
    const evaluate = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result.value;
    await send("Page.enable"); await send("Runtime.enable");
    for (const width of [1440, 768, 390, 320]) for (const theme of ["light", "dark"]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 1100, deviceScaleFactor: 1, mobile: width < 500 });
      await send("Page.navigate", { url: `http://127.0.0.1:${server.address().port}/${theme}` });
      for (let i = 0; i < 100; i++) { if (await evaluate("document.querySelectorAll('.plan').length===3")) break; await pause(50); }
      const result = await evaluate("({overflow:document.documentElement.scrollWidth>innerWidth,cards:document.querySelectorAll('.plan').length,background:getComputedStyle(document.querySelector('.plan')).backgroundColor,buttons:[...document.querySelectorAll('.payButton')].map(e=>e.getBoundingClientRect().height)})");
      assert.equal(result.overflow, false); assert.equal(result.cards, 3); assert.ok(result.buttons.every((height) => height >= 44));
      await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true }).then((s) => fs.writeFileSync(path.join(output, `${theme}-${width}.png`), Buffer.from(s.data, "base64")));
      report.checks.push({ width, theme, ...result });
    }
    assert.deepEqual(report.runtimeErrors, []);
    report.passed = true;
  } finally {
    socket?.close(); chrome.kill(); server.close();
    fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
