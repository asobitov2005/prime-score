// Real local Next -> API -> isolated DB. No request mocking or public fixture route.
// E2E_MOCK_DIR is output from prepare-mock-local.py; E2E_DATABASE_URL is mandatory.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn, execFileSync } = require("node:child_process");
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = process.env.E2E_MOCK_DIR;
assert.ok(output, "E2E_MOCK_DIR required");
const dbUrl = new URL(process.env.E2E_DATABASE_URL);
assert.ok(["127.0.0.1", "localhost"].includes(dbUrl.hostname));
assert.equal(dbUrl.port, "55435");
assert.equal(dbUrl.pathname, "/primescore_test");
const frontend = "http://127.0.0.1:3107";
const api = "http://127.0.0.1:8017/api";
const authPath = path.join(output, "auth.json");
assert.equal(fs.statSync(authPath).mode & 0o077, 0);
const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
const fixture = JSON.parse(fs.readFileSync(path.join(output, "manifest.json"), "utf8"));
const report = { output, frontend, api, started_at: new Date().toISOString(), checks: [], screenshots: [], network: [], runtime_errors: [] };
const save = () => fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2), { mode: 0o600 });

function persistence() {
  const code = `
import asyncio,json,os
from uuid import UUID
import asyncpg
async def main():
 c=await asyncpg.connect(os.environ['E2E_DATABASE_URL'])
 async with c.transaction(readonly=True):
  if tuple(await c.fetchrow('SELECT current_database(),inet_server_port()'))!=('primescore_test',55435): raise RuntimeError('Unexpected database')
  uid=UUID(os.environ['E2E_USER_ID'])
  assert await c.fetchval('SELECT NOT show_on_leaderboard FROM users WHERE id=$1',uid)
  bookings=[dict(r) for r in await c.fetch('SELECT id,schedule_id FROM offline_mock_bookings WHERE user_id=$1',uid)]
  attempts=[dict(r) for r in await c.fetch("SELECT id,test_id,test_type,scope,mode,status,jsonb_array_length(test_snapshot->'sections') AS sections FROM attempts WHERE user_id=$1",uid)]
 print(json.dumps({'bookings':bookings,'attempts':attempts},default=str))
 await c.close()
asyncio.run(main())`;
  return JSON.parse(execFileSync(path.resolve(__dirname, "../../../backend/.venv/bin/python"), ["-c", code], { encoding: "utf8", env: { ...process.env, E2E_USER_ID: auth.user.id } }));
}

async function main() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "primescore-mock-browser-"));
  const chrome = spawn("/usr/bin/google-chrome", ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let socket, send, evaluate;
  try {
    report.before = persistence();
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await pause(100);
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    socket = new WebSocket(targets.find(target => target.type === "page").webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener("open", resolve, { once: true }));
    let id = 0;
    const pending = new Map();
    send = (method, params = {}) => new Promise((resolve, reject) => {
      const number = ++id;
      const timer = setTimeout(() => { pending.delete(number); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      pending.set(number, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id: number, method, params }));
    });
    socket.onmessage = event => {
      const message = JSON.parse(event.data);
      if (message.id) { const task = pending.get(message.id); if (task) { pending.delete(message.id); message.error ? task.reject(message.error) : task.resolve(message.result); } return; }
      if (message.method === "Runtime.exceptionThrown") report.runtime_errors.push(message.params.exceptionDetails.text);
      if (message.method === "Page.javascriptDialogOpening") void send("Page.handleJavaScriptDialog", { accept: true });
      if (message.method === "Network.responseReceived") {
        const response = message.params.response;
        const url = new URL(response.url);
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/internal-api/")) report.network.push({ url: url.origin + url.pathname + url.search, status: response.status });
      }
    };
    evaluate = async expression => {
      const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    const wait = async (expression, timeout = 60000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) { if (await evaluate(expression)) return; await pause(150); }
      throw new Error(`UI timeout: ${expression}`);
    };
    const click = async selector => { await wait(`!!document.querySelector(${JSON.stringify(selector)}) && !document.querySelector(${JSON.stringify(selector)}).disabled`); await evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`); };
    const navigate = async url => { await send("Page.navigate", { url }); };
    const screenshot = async name => {
      await pause(200);
      fs.writeFileSync(path.join(output, name), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
      report.screenshots.push(name); save();
    };
    const catalogReady = async mode => { await wait(`document.querySelector('#mock-title')?.textContent===${JSON.stringify(mode === "offline" ? "Book your mock" : "Full Mock Tests")} && document.querySelector('[aria-busy="false"]') && document.querySelectorAll('[data-${mode === "offline" ? "schedule" : "bundle"}-id]').length>0`); };
    const captureMatrix = async label => {
      for (const width of [1440, 390, 320]) {
        await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
        for (const theme of ["light", "dark"]) {
          await evaluate(`document.documentElement.classList.remove('light','dark');document.documentElement.classList.add('${theme}');document.querySelectorAll('*').forEach(el=>{if(el.scrollTop)el.scrollTo({top:0,behavior:'instant'})})`);
          await pause(150);
          assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth"), true);
          const cards = await evaluate("[...document.querySelectorAll('[data-schedule-id],[data-bundle-id]')].slice(0,2).map(e=>({x:e.getBoundingClientRect().x,y:e.getBoundingClientRect().y}))");
          if (cards.length === 2) assert.equal(Math.abs(cards[0].y - cards[1].y) < 2, width === 1440);
          await screenshot(`${label}-${width}-${theme}.png`);
          report.checks.push(`${label}: ${width}px ${theme}, layout/overflow pass`);
        }
      }
      await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    };
    await send("Page.enable"); await send("Runtime.enable"); await send("Network.enable");
    await send("Network.setBlockedURLs", { urls: ["*://*.googletagmanager.com/*", "*://*.google-analytics.com/*", "*://primescore.uz/*", "*://*.primescore.uz/*"] });
    const authenticate = async () => {
      await send("Network.setCookies", { cookies: Object.entries({ primescore_user_access_token: auth.access_token, primescore_user_refresh_token: auth.refresh_token, primescore_user_session_id: auth.session_id }).map(([name, value]) => ({ name, value: encodeURIComponent(value), url: frontend, path: "/", sameSite: "Lax" })) });
      const state = { userId: auth.user.id, sessionId: auth.session_id, accessToken: auth.access_token, refreshToken: auth.refresh_token, name: auth.user.first_name, phoneNumber: auth.user.phone, isPremium: auth.user.is_premium, premiumUntil: auth.user.premium_until, createdAt: auth.user.created_at, avatarUrl: null, isAuthenticated: true, welcomeBonusDays: 0 };
      return (await send("Page.addScriptToEvaluateOnNewDocument", { source: `if(location.origin===${JSON.stringify(frontend)})localStorage.setItem('prime-auth-storage',${JSON.stringify(JSON.stringify({ state, version: 0 }))})` })).identifier;
    };
    const authScript = await authenticate();
    await navigate(`${frontend}/mock?mode=offline`); await catalogReady("offline");
    await captureMatrix("offline");
    await click('button[aria-label="Page 2"]');
    await wait("document.querySelector('button[aria-current=" + JSON.stringify("page") + "]')?.textContent==='2' && !!document.querySelector('[aria-busy=" + JSON.stringify("false") + "]')");
    const page2Ids = await evaluate("[...document.querySelectorAll('[data-schedule-id]')].map(e=>e.dataset.scheduleId)");
    assert.ok(page2Ids.length > 0);
    await screenshot("offline-page-2.png"); report.checks.push("Offline server pagination reaches page 2");
    await click('button[aria-label="Page 1"]'); await catalogReady("offline");
    const catalog = await (await fetch(`${api}/mock/offline-schedules?page=1&page_size=6`)).json();
    const scheduleId = catalog.items.find(item => item.available_seats > 1 && !report.before.bookings.some(booking => booking.schedule_id === item.id)).id;
    const beforeSeats = catalog.items.find(item => item.id === scheduleId).available_seats;
    await click(`[data-schedule-id="${scheduleId}"] button`);
    await wait("document.body.textContent.includes('Reservation saved')"); await catalogReady("offline");
    await wait(`document.querySelector('[data-schedule-id="${scheduleId}"]')?.textContent.includes('${beforeSeats - 1} ${beforeSeats - 1 === 1 ? "seat" : "seats"} left')`);
    assert.equal(persistence().bookings.filter(item => item.schedule_id === scheduleId).length, 1);
    await screenshot("offline-booked.png");
    await send("Page.reload", { ignoreCache: true }); await catalogReady("offline");
    await wait(`document.querySelector('[data-schedule-id="${scheduleId}"] button')?.disabled`);
    report.checks.push("Booking persisted once; exact remaining seats and reserved state survive reload");
    await click('[aria-label="Mock session type"] button:first-child'); await catalogReady("online");
    await captureMatrix("online");
    assert.equal(await evaluate("document.querySelector('[aria-label=" + JSON.stringify("Online mock tests") + "]').textContent.includes('Speaking')"), false);
    await click('button[aria-label="Page 2"]');
    await wait("document.querySelector('[aria-current=" + JSON.stringify("page") + "]')?.textContent==='2' && !!document.querySelector('[data-bundle-id]')");
    report.checks.push("Online bundle server pagination reaches page 2");
    await click('button[aria-label="Page 1"]'); await catalogReady("online");
    const visibleBundles = await evaluate("[...document.querySelectorAll('[data-bundle-id]')].map(item=>item.dataset.bundleId)");
    const bundleId = visibleBundles.find(value => fixture.bundle_ids.includes(value));
    assert.ok(bundleId, "An owned isolated bundle must be visible");
    await click(`[data-bundle-id="${bundleId}"]`); await wait("!!document.querySelector('#bundle-title')");
    assert.equal(await evaluate("document.querySelectorAll('[data-stage]').length"), 4);
    assert.equal(persistence().attempts.length, report.before.attempts.length, "Catalog/hub must not prefetch-create attempts");
    await screenshot("bundle-hub.png");
    const detail = await (await fetch(`${api}/mock/online-mocks/${bundleId}`, { headers: { Authorization: `Bearer ${auth.access_token}` } })).json();
    assert.equal(detail.total_seconds, detail.stages.reduce((total, stage) => total + stage.time_limit_seconds, 0));
    report.bundle = detail;
    for (const skill of ["reading", "listening"]) {
      await navigate(`${frontend}/mock/online/${bundleId}`); await wait("!!document.querySelector('#bundle-title')");
      await click(`[data-stage="${skill}"]`);
      await wait(`location.pathname==='/exam-preview/${skill}' && document.querySelectorAll('input, [data-question-anchor], [data-question-id]').length>0`, 90000);
      const persisted = persistence().attempts.find(item => item.test_id === fixture[`${skill}_test_id`]);
      assert.ok(persisted && persisted.sections > 0, `${skill} real attempt/snapshot required`);
      assert.equal(persisted.mode.toLowerCase(), "exam"); assert.equal(persisted.scope.toLowerCase(), "full");
      assert.equal(await evaluate("document.body.textContent.includes('Premium required') || document.body.textContent.includes('Unable to start')"), false);
      await screenshot(`${skill}-launched.png`);
      report.checks.push(`${skill}: clicked real stage link; persisted full exam attempt and rendered questions`);
    }
    for (const key of ["writing_task_1", "writing_task_2"]) {
      await navigate(`${frontend}/mock/online/${bundleId}`); await wait("!!document.querySelector('#bundle-title')");
      await click(`[data-stage="${key}"]`); await wait("!!document.querySelector('textarea[placeholder=" + JSON.stringify("Start writing your answer here") + "]')");
      await screenshot(`${key}-launched.png`); report.checks.push(`${key}: real prompt/workspace opened`);
    }
    await send("Page.removeScriptToEvaluateOnNewDocument", { identifier: authScript });
    await send("Network.clearBrowserCookies"); await evaluate("localStorage.clear()");
    const guestSchedule = catalog.items.find(item => item.id !== scheduleId && !report.before.bookings.some(booking => booking.schedule_id === item.id)).id;
    await navigate(`${frontend}/mock?mode=offline&mockBooking=${guestSchedule}`); await wait("location.pathname==='/login'");
    const returnUrl = await evaluate("new URL(location.href).searchParams.get('returnUrl')");
    assert.equal(returnUrl, `/mock?mode=offline&mockBooking=${guestSchedule}`);
    report.checks.push("Existing guest route guard redirects to login with pending schedule intact");
    await authenticate(); await navigate(frontend + returnUrl);
    await wait("document.body.textContent.includes('Reservation saved') && !location.search.includes('mockBooking')");
    assert.equal(persistence().bookings.filter(item => item.schedule_id === guestSchedule).length, 1);
    report.checks.push("Login return completes the real booking once and removes the pending query");
    report.after = persistence();
    assert.equal(report.runtime_errors.length, 0);
    report.passed = true; report.finished_at = new Date().toISOString(); save();
    console.log(JSON.stringify({ passed: true, output, checks: report.checks.length, bundle_id: bundleId, bookings: report.after.bookings.length, attempts: report.after.attempts.length }));
  } catch (error) {
    report.passed = false; report.error = error.message || String(error);
    if (evaluate && send) try { report.failure_ui = await evaluate("({url:location.href,text:document.body.innerText})"); fs.writeFileSync(path.join(output, "failure.png"), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64")); } catch {}
    save(); throw error;
  } finally { socket?.close(); chrome.kill(); }
}
main().catch(error => { console.error(error.message || String(error)); process.exitCode = 1; });
