// Run against an isolated local API: node tests/mock-management.browser.cjs offline|online /path/to/admin-auth.json [component-ids.json]
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const scenario = process.argv[2];
const authPath = process.argv[3];
if (!["offline", "online"].includes(scenario) || !authPath) {
  throw new Error("Expected offline|online and a local test admin-auth.json path.");
}
const origin = "http://127.0.0.1:3117";
const apiOrigin = "http://127.0.0.1:8017/api/admin";
const artifacts = "/tmp/primescore-admin-mock-ui-e2e";
const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
const componentIds = process.argv[4] ? JSON.parse(fs.readFileSync(process.argv[4], "utf8")) : {};

async function api(resource) {
  const response = await fetch(`${apiOrigin}/${resource}`, { headers: { Authorization: `Bearer ${auth.access_token}` } });
  if (!response.ok) throw new Error(`${resource}: HTTP ${response.status} ${await response.text()}`);
  return response.json();
}

async function main() {
  await api("auth/me");
  const targets = await (await fetch("http://127.0.0.1:9337/json/list")).json();
  const target = targets.find((item) => item.type === "page" && item.url.startsWith(origin)) ?? targets.find((item) => item.type === "page");
  assert.ok(target, "Start isolated headless Chrome with --remote-debugging-port=9337 first.");
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener("open", resolve, { once: true }); socket.addEventListener("error", reject, { once: true }); });
  let nextId = 0;
  const pending = new Map();
  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    clearTimeout(task.timeout);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  });
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
      pending.set(id, { resolve, reject, timeout });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
    return response.result.value;
  }
  async function waitFor(expression) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
    throw new Error(`Browser condition failed: ${expression}\n${await evaluate("document.body.innerText.slice(-2500)")}`);
  }
  async function fill(id, value) {
    await evaluate(`(() => {
      const element = document.getElementById(${JSON.stringify(id)});
      if (!element) throw new Error('Missing input: ' + ${JSON.stringify(id)});
      const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, ${JSON.stringify(value)});
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  async function clickButton(label) {
    await evaluate(`(() => {
      const button = Array.from(document.querySelectorAll('button')).find(item => item.textContent.trim() === ${JSON.stringify(label)});
      if (!button || button.disabled) throw new Error('Button unavailable: ' + ${JSON.stringify(label)});
      button.click();
    })()`);
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  async function capture(name) {
    fs.mkdirSync(artifacts, { recursive: true });
    for (const width of [1440, 390]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width === 390 });
      await evaluate("window.scrollTo(0, 0)");
      await new Promise((resolve) => setTimeout(resolve, 150));
      assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), true, `Horizontal overflow at ${width}px`);
      const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(artifacts, `${name}-${width}.png`), Buffer.from(shot.data, "base64"));
    }
    await send("Emulation.clearDeviceMetricsOverride");
  }
  try {
    await send("Network.setCookie", { name: "primescore_admin_access_token", value: auth.access_token, url: origin, path: "/", sameSite: "Lax" });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${origin}/${scenario === "online" ? "online-full-mocks" : "mock-schedules"}` });
    const suffix = Date.now();
    let report;
    if (scenario === "offline") {
      await waitFor("!!document.getElementById('mock-title')");
      await waitFor("!document.body.innerText.includes('Loading schedules...')");
      const title = `Local admin browser schedule ${suffix}`;
      await fill("mock-title", title);
      await fill("mock-location", "Local admin test venue");
      await fill("mock-address", "Room 21, isolated browser address");
      await fill("mock-capacity", "17");
      await evaluate("(() => { const box = document.querySelector('form input[type=checkbox]'); if (box.checked) box.click(); })()");
      await clickButton("Create 1 session");
      await waitFor("document.querySelector('[role=status]')?.textContent.includes('1 session added')");
      let saved = (await api("mock/offline-schedules")).items.find((item) => item.title === title);
      assert.ok(saved);
      assert.equal(saved.address, "Room 21, isolated browser address");
      assert.equal(saved.capacity, 17);
      assert.equal(saved.reserved_count, 0);
      assert.equal(saved.available_seats, 17);
      assert.equal(saved.is_published, false);
      await evaluate(`Array.from(document.querySelectorAll('article')).find(item => item.textContent.includes(${JSON.stringify(title)})).querySelector('button[aria-label^="Edit "]').click()`);
      await fill("mock-address", "Room 22, edited browser address");
      await clickButton("Save changes");
      await waitFor("document.querySelector('[role=status]')?.textContent.includes('Schedule updated')");
      saved = (await api("mock/offline-schedules")).items.find((item) => item.id === saved.id);
      assert.equal(saved.address, "Room 22, edited browser address");
      assert.equal(saved.location, "Local admin test venue");
      assert.equal(saved.capacity, 17);
      assert.equal(saved.available_seats, 17);
      assert.equal(saved.is_published, false);
      assert.match(await evaluate("document.body.innerText"), /17 available \/ 17 total seats/);
      assert.match(await evaluate("document.body.innerText"), /Speaking included/);
      report = { scenario, created_and_edited: true, api_verified: true, record: saved };
    } else {
      await waitFor("!!document.getElementById('full-mock-title')");
      const title = `Local admin browser Full Mock ${suffix}`;
      await fill("full-mock-title", title);
      const components = {};
      for (const id of ["reading_test_id", "listening_test_id", "writing_task_1_id", "writing_task_2_id"]) {
        const expected = componentIds[id];
        const value = await evaluate(`Array.from(document.getElementById(${JSON.stringify(id)}).options).find(item => item.value && !item.disabled ${expected ? `&& item.value === ${JSON.stringify(expected)}` : ""})?.value`);
        assert.ok(value, `No eligible real component: ${id}`);
        components[id] = value;
        await fill(id, value);
      }
      assert.equal(await evaluate("Array.from(document.querySelectorAll('button')).find(item => item.textContent.trim() === 'Publish Full Mock').disabled"), true);
      await evaluate("Array.from(document.querySelectorAll('label')).find(item => item.textContent.includes('I have verified')).querySelector('input').click()");
      await clickButton("Save draft");
      await waitFor("document.querySelector('[role=status]')?.textContent.includes('saved as a draft')");
      let saved = (await api("mock/online-mocks?page_size=100")).items.find((item) => item.title === title);
      assert.ok(saved);
      assert.equal(saved.description, null);
      assert.equal(saved.is_published, false);
      assert.equal(saved.academic_confirmed, true);
      for (const [key, id] of Object.entries(components)) assert.equal(saved[key], id);
      await fill("full-mock-title", `${title} edited`);
      await clickButton("Save changes");
      await waitFor(`document.querySelector('[role=status]')?.textContent.includes('saved as a draft') && !document.querySelector('fieldset').disabled`);
      saved = await api(`mock/online-mocks/${saved.id}`);
      assert.equal(saved.title, `${title} edited`);
      await clickButton("Publish Full Mock");
      await waitFor("document.querySelector('[role=status]')?.textContent.includes('Full Mock published')");
      saved = await api(`mock/online-mocks/${saved.id}`);
      assert.equal(saved.is_published, true);
      await clickButton("Unpublish");
      await waitFor("document.querySelector('[role=status]')?.textContent.includes('Full Mock unpublished')");
      saved = await api(`mock/online-mocks/${saved.id}`);
      assert.equal(saved.is_published, false);
      report = { scenario, created_edited_published_unpublished: true, api_verified: true, record: saved };
    }
    await capture(scenario);
    fs.writeFileSync(path.join(artifacts, `${scenario}-result.json`), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log(`Desktop/mobile screenshots: ${artifacts}/${scenario}-{1440,390}.png`);
  } finally {
    socket.close();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
