// Real UI -> HTTP -> Celery -> PostgreSQL -> result UI. No request mocks or result fixtures.
// Required: E2E_AUTH_FILE, E2E_INPUT_FILE, E2E_FRONTEND_URL, E2E_API_URL,
// E2E_DATABASE_URL, E2E_REDIS_URL. Run only against the isolated local stack.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn, execFileSync } = require("node:child_process");

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const root = path.resolve(__dirname, "../..");
const python = path.resolve(root, "../backend/.venv/bin/python");
const required = (key) => {
  assert.ok(process.env[key], `${key} must be explicitly configured`);
  return process.env[key];
};
const localUrl = (value, protocols) => {
  const url = new URL(value);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Only loopback targets are permitted");
  assert.ok(protocols.includes(url.protocol), "Unexpected target protocol");
  return url;
};

function inspectPersistence(auth, submissionId = "") {
  const code = `
import asyncio, json, os
from uuid import UUID
import asyncpg
from celery import Celery
from redis import Redis

async def main():
    conn = await asyncpg.connect(os.environ["E2E_DATABASE_URL"].replace("postgresql+asyncpg:", "postgresql:"))
    try:
        async with conn.transaction(readonly=True):
            identity = await conn.fetchrow("SELECT current_database() AS name, inet_server_port() AS port")
            assert identity["name"] == "primescore_test" and identity["port"] == 55435
            user = await conn.fetchrow("SELECT id, show_on_leaderboard, deleted_at FROM users WHERE id=$1", UUID(os.environ["E2E_USER_ID"]))
            assert user and not user["show_on_leaderboard"] and user["deleted_at"] is None, "A private isolated user is required"
            session = await conn.fetchrow("SELECT id FROM sessions WHERE id=$1 AND user_id=$2 AND is_active AND expires_at>now()", UUID(os.environ["E2E_SESSION_ID"]), user["id"])
            assert session, "Active real DB session required"
            result = {"database": dict(identity), "user_id": str(user["id"]), "session_active": True}
            sid = os.environ.get("E2E_SUBMISSION_ID")
            if sid:
                row = await conn.fetchrow("""SELECT s.id, s.user_id, s.status, s.celery_task_id, s.essay_text,
                    s.error_message, s.word_count, t.source, t.status AS task_status, t.prompt_html,
                    e.id AS evaluation_id, e.overall_band, e.cache_hit, e.model_version, e.feedback,
                    e.inline_annotations, e.roast_feedback, e.graded_at, r.id AS run_id,
                    r.audit_result, r.initial_scores, r.mode
                    FROM writing_submissions s JOIN writing_tasks t ON t.id=s.task_id
                    LEFT JOIN writing_evaluations e ON e.submission_id=s.id
                    LEFT JOIN writing_evaluation_runs r ON r.submission_id=s.id
                    WHERE s.id=$1 AND s.user_id=$2""", UUID(sid), user["id"])
                assert row, "Submission not persisted for the authenticated user"
                result["submission"] = dict(row)
    finally:
        await conn.close()
    redis_url = os.environ["E2E_REDIS_URL"]
    if not os.environ.get("E2E_SUBMISSION_ID"):
        queues = Celery("writing-e2e-inspect", broker=redis_url).control.inspect(timeout=5).active_queues() or {}
        workers = [name for name, entries in queues.items() if any(q["name"] == "writing" for q in entries)]
        assert workers, "No real Celery worker is consuming the writing queue"
        result["writing_workers"] = workers
    else:
        task_id = result["submission"]["celery_task_id"]
        assert task_id, "Missing Celery task id"
        data = Redis.from_url(redis_url).get("celery-task-meta-" + task_id)
        result["celery"] = json.loads(data) if data else None
    print(json.dumps(result, default=str))

asyncio.run(main())
`;
  return JSON.parse(execFileSync(python, ["-c", code], {
    cwd: path.resolve(root, "../backend"), encoding: "utf8", timeout: 25000,
    env: { ...process.env, E2E_USER_ID: auth.user.id, E2E_SESSION_ID: auth.session_id, E2E_SUBMISSION_ID: submissionId },
    stdio: ["ignore", "pipe", "pipe"],
  }));
}

async function run() {
  const frontend = localUrl(required("E2E_FRONTEND_URL"), ["http:"]);
  const api = localUrl(required("E2E_API_URL"), ["http:"]);
  const db = localUrl(required("E2E_DATABASE_URL").replace("postgresql+asyncpg:", "postgresql:"), ["postgresql:"]);
  const redis = localUrl(required("E2E_REDIS_URL"), ["redis:"]);
  assert.equal(db.port, "55435");
  assert.equal(db.pathname, "/primescore_test");
  assert.equal(redis.port, "56380");
  const authPath = required("E2E_AUTH_FILE");
  assert.equal(fs.statSync(authPath).mode & 0o077, 0, "Auth file must not be group/world readable");
  const auth = JSON.parse(fs.readFileSync(authPath, "utf8"));
  assert.ok(auth.user?.id && auth.session_id && auth.access_token && auth.refresh_token, "AuthLoginResponse JSON required");
  const input = JSON.parse(fs.readFileSync(required("E2E_INPUT_FILE"), "utf8"));
  assert.ok(input.topic?.trim() && input.essay_text?.trim());
  assert.ok(input.essay_text.trim().split(/\s+/).length >= 125, "Use an input that can be submitted through the real Task 2 UI");
  assert.ok(["completed", "rejected"].includes(input.expected_status));
  const deadlineMs = Number(process.env.E2E_TIMEOUT_MS ?? 900000);
  const output = fs.mkdtempSync(path.join(os.tmpdir(), "primescore-writing-e2e-"));
  const report = { started_at: new Date().toISOString(), frontend: frontend.origin, api: api.origin, output, network: [], ui_checks: [], runtime_errors: [] };
  const save = () => fs.writeFileSync(path.join(output, "report.json"), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(`Evidence directory: ${output}`);
  report.preflight = inspectPersistence(auth);
  const apiBase = api.href.replace(/\/$/, "");
  const meResponse = await fetch(`${apiBase}/me`, { headers: { Authorization: `Bearer ${auth.access_token}` } });
  assert.equal(meResponse.status, 200, "Real bearer authentication failed");
  assert.equal((await meResponse.json()).id, auth.user.id);

  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "primescore-writing-browser-"));
  const chrome = spawn(process.env.E2E_CHROME_BIN || "/usr/bin/google-chrome", [
    "--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run",
    "--disable-background-networking", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank",
  ], { stdio: "ignore" });
  let socket;
  let send;
  let evaluate;
  try {
    const portFile = path.join(profile, "DevToolsActivePort");
    for (let i = 0; i < 100 && !fs.existsSync(portFile); i++) await pause(100);
    const port = fs.readFileSync(portFile, "utf8").split("\n")[0];
    const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    socket = new WebSocket(targets.find((target) => target.type === "page").webSocketDebuggerUrl);
    await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
    let nextId = 0;
    const pending = new Map();
    const requests = new Map();
    const statuses = [];
    let submitted = null;
    let submissionRequest = null;
    let fatal = null;
    const bodyReads = new Set();
    send = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id) {
        const task = pending.get(message.id);
        if (task) { pending.delete(message.id); message.error ? task.reject(message.error) : task.resolve(message.result); }
        return;
      }
      const { method, params } = message;
      if (method === "Runtime.exceptionThrown") report.runtime_errors.push(params.exceptionDetails.text);
      if (method === "Network.requestWillBeSent") {
        const url = new URL(params.request.url);
        if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/internal-api/")) {
          if (![frontend.origin, api.origin].includes(url.origin)) fatal = new Error("Non-local API request detected");
          const item = { method: params.request.method, path: url.pathname, at: new Date().toISOString() };
          requests.set(params.requestId, item);
          if (item.method === "POST" && item.path.endsWith("/writing/submissions")) {
            submissionRequest = JSON.parse(params.request.postData);
          }
        }
      }
      if (method === "Network.responseReceived" && requests.has(params.requestId)) {
        const item = requests.get(params.requestId);
        item.status = params.response.status;
        report.network.push(item);
      }
      if (method === "Network.loadingFinished" && requests.has(params.requestId)) {
        const item = requests.get(params.requestId);
        const isSubmission = item.method === "POST" && item.path.endsWith("/writing/submissions");
        const isStatus = /\/writing\/submissions\/[^/]+$/.test(item.path) && item.method === "GET";
        if (!isSubmission && !isStatus) return;
        const job = send("Network.getResponseBody", { requestId: params.requestId }).then(({ body, base64Encoded }) => {
          const payload = JSON.parse(base64Encoded ? Buffer.from(body, "base64").toString() : body);
          if (isSubmission) {
            if (item.status !== 201) throw new Error(`Submission HTTP ${item.status}: ${payload.detail}`);
            submitted = payload;
            report.submission_id = payload.id;
            console.log(`Submitted through UI: ${payload.id}`);
            save();
          }
          if (payload.status) statuses.push(payload.status);
        }).catch(error => { fatal = error; }).finally(() => bodyReads.delete(job));
        bodyReads.add(job);
      }
      if (method === "Network.eventSourceMessageReceived") {
        try { const payload = JSON.parse(params.data); if (payload.status) statuses.push(payload.status); } catch {}
      }
    });
    evaluate = async (expression) => {
      const value = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (value.exceptionDetails) throw new Error(`Browser evaluation failed: ${value.exceptionDetails.text}`);
      return value.result.value;
    };
    const waitFor = async (expression, timeout = 60000) => {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        if (fatal) throw fatal;
        if (await evaluate(expression)) return;
        await pause(250);
      }
      throw new Error(`Timed out waiting for UI: ${expression}`);
    };
    const clickText = async (text) => {
      const predicate = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)} && b.getClientRects().length && !b.disabled)`;
      await waitFor(`!!(${predicate})`);
      await evaluate(`(${predicate}).click()`);
    };
    const fill = async (selector, text) => {
      await waitFor(`!!document.querySelector(${JSON.stringify(selector)})`);
      await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
      await send("Input.insertText", { text });
    };
    const screenshot = async (name) => {
      fs.writeFileSync(path.join(output, name), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
    };
    await send("Runtime.enable");
    await send("Page.enable");
    await send("Network.enable");
    // Only suppress analytics/production endpoints; never fulfill or replace API requests.
    await send("Network.setBlockedURLs", { urls: ["*://*.googletagmanager.com/*", "*://*.google-analytics.com/*", "*://primescore.uz/*", "*://*.primescore.uz/*"] });
    await send("Emulation.setFocusEmulationEnabled", { enabled: true });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const cookieValues = {
      primescore_user_access_token: auth.access_token,
      primescore_user_refresh_token: auth.refresh_token,
      primescore_user_session_id: auth.session_id,
    };
    await send("Network.setCookies", { cookies: Object.entries(cookieValues).map(([name, value]) => ({ name, value: encodeURIComponent(value), url: frontend.origin, path: "/", sameSite: "Lax" })) });
    const state = {
      userId: auth.user.id, sessionId: auth.session_id, accessToken: auth.access_token, refreshToken: auth.refresh_token,
      name: [auth.user.first_name, auth.user.last_name].filter(Boolean).join(" "), phoneNumber: auth.user.phone,
      isPremium: auth.user.is_premium, premiumUntil: auth.user.premium_until, createdAt: auth.user.created_at,
      avatarUrl: null, isAuthenticated: true, welcomeBonusDays: 0,
    };
    await send("Page.addScriptToEvaluateOnNewDocument", { source: `if(location.origin===${JSON.stringify(frontend.origin)}&&!localStorage.getItem('prime-auth-storage')) { localStorage.setItem('prime-auth-storage', ${JSON.stringify(JSON.stringify({ state, version: 0 }))}); }` });
    await send("Page.navigate", { url: `${frontend.origin}/writing?task_type=task_2` });
    await clickText("Check My Essay");
    await fill("#custom-task_2-prompt", input.topic);
    await clickText("Open workspace");
    await fill('textarea[placeholder="Start writing your answer here"]', input.essay_text);
    await screenshot("01-composed-essay.png");
    await clickText("Submit");
    await waitFor("/\\/writing\\/submissions\\/[^/]+\\/result$/.test(location.pathname)", 60000);
    await screenshot("02-grading.png");
    await waitFor("!!document.querySelector('#writing-analysis-title,#writing-failure-title')", deadlineMs);
    await Promise.all([...bodyReads]);
    assert.ok(submitted?.id, "No real submission response captured");
    assert.deepEqual(submissionRequest.essay_text, input.essay_text);
    assert.deepEqual(submissionRequest.topic, input.topic.trim());
    assert.equal(submissionRequest.task_type, "task_2");
    assert.ok(!submissionRequest.task_id, "Only private custom tasks may be created");
    report.observed_statuses = [...new Set(statuses)];
    let persisted;
    for (let i = 0; i < 20; i++) {
      persisted = inspectPersistence(auth, submitted.id);
      if (persisted.celery?.status === "SUCCESS") break;
      await pause(1000);
    }
    report.persistence = persisted;
    assert.equal(persisted.submission.source, "user_custom");
    assert.equal(persisted.submission.task_status.toLowerCase(), "draft");
    assert.equal(persisted.submission.essay_text, input.essay_text);
    assert.equal(persisted.celery?.status, "SUCCESS", "Celery did not finish the dispatched task");
    assert.equal(persisted.celery.result.submission_id, submitted.id);
    assert.equal(persisted.celery.result.status, input.expected_status);
    if (process.env.E2E_WORKER_LOG) {
      const lines = fs.readFileSync(process.env.E2E_WORKER_LOG, "utf8").split("\n").filter(line => line.includes(persisted.submission.celery_task_id));
      assert.ok(lines.some(line => line.includes("received")), "Worker log must confirm dispatch receipt");
      assert.ok(lines.some(line => line.includes("succeeded")), "Worker log must confirm execution completed");
      report.worker_log = lines;
    }
    const resultResponse = await fetch(`${apiBase}/writing/submissions/${submitted.id}/result`, { headers: { Authorization: `Bearer ${auth.access_token}` } });
    if (input.expected_status === "completed") {
      assert.equal(persisted.submission.status.toLowerCase(), "completed");
      assert.ok(persisted.submission.evaluation_id && persisted.submission.run_id);
      assert.equal(persisted.submission.cache_hit, false, "A cached evaluation is not a live provider E2E");
      assert.equal(resultResponse.status, 200);
      report.api_result = await resultResponse.json();
      assert.equal(Number(report.api_result.overall_band), persisted.submission.overall_band);
      if (input.expected_task_relation) assert.equal(report.api_result.audit_result?.task_fit?.task_relation, input.expected_task_relation);
      await waitFor("!!document.querySelector('#writing-analysis-title')");
      const fit = report.api_result.audit_result?.task_fit;
      if (fit && ["partial", "off_topic", "wrong_task", "uncertain"].includes(fit.task_relation)) {
        assert.equal(await evaluate(`document.querySelector('[aria-labelledby="writing-task-fit-title"]')?.textContent.includes(${JSON.stringify(fit.explanation)})`), true);
        report.ui_checks.push(`Visible ${fit.task_relation} warning matches actual model explanation; score retained`);
      }
      await evaluate("document.querySelector('#writing-task_achievement summary').click()");
      assert.equal(await evaluate("document.querySelector('#writing-task_achievement').open"), true);
      await evaluate("document.querySelector('#writing-task_achievement').scrollIntoView({block:'start'})");
      await screenshot("04-criterion-disclosure.png");
      await evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)");
      for (const key of ["task_achievement", "coherence", "lexical", "grammar"]) {
        const data = report.api_result[key];
        assert.equal(await evaluate(`document.querySelector('#writing-${key}').textContent.includes(${JSON.stringify(Number(data.band).toFixed(1))})`), true);
        if (data.reasoning) assert.equal(await evaluate(`document.querySelector('#writing-${key}').textContent.includes(${JSON.stringify(data.reasoning)})`), true);
      }
      report.ui_checks.push("Persisted criterion bands/reasoning match expanded UI");
      await evaluate("document.querySelectorAll('details').forEach(d=>d.open=false)");
    } else {
      assert.equal(persisted.submission.status.toLowerCase(), "failed");
      assert.ok(persisted.submission.error_message.startsWith("WRITING_INPUT_REJECTED:"));
      assert.equal(persisted.submission.evaluation_id, null);
      assert.equal(await evaluate("document.body.textContent.includes('Write a new response')"), true);
      assert.equal(await evaluate("document.body.textContent.includes('Try again') || document.body.textContent.includes('WRITING_INPUT_REJECTED:')"), false);
      report.ui_checks.push("Rejected input has no fabricated score or retry control");
    }
    for (const width of [1440, 390]) {
      await send("Emulation.setDeviceMetricsOverride", { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
      for (const theme of ["light", "dark"]) {
        await evaluate(`document.documentElement.classList.remove('light','dark'); document.documentElement.classList.add('${theme}'); window.scrollTo({top:0,behavior:'instant'})`);
        await pause(300);
        assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth"), true);
        await screenshot(`03-result-${width}-${theme}.png`);
        report.ui_checks.push(`${width}px ${theme}: no horizontal overflow`);
      }
    }
    await send("Page.reload", { ignoreCache: true });
    await waitFor("!!document.querySelector('#writing-analysis-title,#writing-failure-title')");
    assert.equal(await evaluate("location.pathname"), `/writing/submissions/${submitted.id}/result`);
    report.ui_checks.push("Result survives full reload using real server auth cookies");
    assert.equal(report.runtime_errors.length, 0, "Browser runtime errors");
    report.passed = true;
    report.finished_at = new Date().toISOString();
    save();
    console.log(JSON.stringify({ passed: true, submission_id: submitted.id, celery_task_id: persisted.submission.celery_task_id, status: input.expected_status, output }));
  } catch (error) {
    report.passed = false;
    report.error = error.message || String(error);
    if (send && evaluate) {
      try {
        report.failure_ui = await evaluate("({url:location.href,text:document.body?.innerText})");
        fs.writeFileSync(path.join(output, "failure.png"), Buffer.from((await send("Page.captureScreenshot", { format: "png" })).data, "base64"));
      } catch {}
    }
    save();
    throw error;
  } finally {
    socket?.close();
    chrome.kill();
  }
}

run().catch(error => { console.error(error.message || String(error)); process.exitCode = 1; });
