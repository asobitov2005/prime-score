const assert = require("node:assert/strict");
const fs = require("node:fs");
const Module = require("node:module");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

function loadModule(relativePath, mocks = {}) {
  const filename = path.join(__dirname, "..", relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  mod.require = (request) => {
    if (Object.hasOwn(mocks, request)) return mocks[request];
    if (request.startsWith("@/")) return loadModule(`${request.slice(2)}.ts`, mocks);
    return module.require(request);
  };
  mod._compile(compiled, filename);
  return mod.exports;
}

const catalog = {
  tests: [
    { id: "reading", title: "Reading content", type: "reading", format: "full", status: "published" },
    { id: "listening", title: "Listening content", type: "listening", format: "full", status: "published" },
    { id: "partial", title: "Academic Full Mock", type: "reading", format: "passage_1", status: "published" },
    { id: "draft", title: "Academic Reading", type: "reading", format: "full", status: "draft" },
    { id: "archived", title: "Academic Listening", type: "listening", format: "full", status: "archived" },
  ],
  writingTasks: [
    { id: "task1", title: "Chart", task_type: "task_1", status: "published" },
    { id: "task2", title: "Essay", task_type: "task_2", status: "published" },
    { id: "unpublished-writing", title: "Academic Writing", task_type: "task_1", status: "draft" },
  ],
};
const input = {
  title: "Full Mock", description: null, reading_test_id: "reading", listening_test_id: "listening",
  writing_task_1_id: "task1", writing_task_2_id: "task2", is_published: false, academic_confirmed: false,
};
const baseMocks = {
  "@/lib/api": { adminApi: {} }, "@/lib/writing-api": { writingApi: {} },
  "@/lib/public-api": { ADMIN_PUBLIC_API_BASE_URL: "http://admin.test/api/admin" },
  "@/lib/auth": { fetchAdminApi: async () => { throw new Error("Unexpected request"); } },
};
const mockLib = loadModule("lib/online-mock-api.ts", baseMocks);

test("Full Mock selectors require published full tests and correctly typed writing tasks, not title matches", () => {
  for (const [key, id] of [["reading_test_id", "reading"], ["listening_test_id", "listening"], ["writing_task_1_id", "task1"], ["writing_task_2_id", "task2"]]) {
    assert.deepEqual(mockLib.getMockComponentOptions(catalog, key).map((item) => item.id), [id]);
  }
  assert.equal(mockLib.MOCK_COMPONENTS.length, 4);
  assert.equal(mockLib.MOCK_COMPONENTS.some((item) => item.key.includes("speaking")), false);
});

test("publishing requires explicit Academic confirmation and all four eligible DB references", () => {
  assert.equal(mockLib.validateOnlineMock(input, catalog), null);
  assert.match(mockLib.validateOnlineMock({ ...input, is_published: true }, catalog), /Confirm/);
  assert.equal(mockLib.validateOnlineMock({ ...input, is_published: true, academic_confirmed: true }, catalog), null);
  assert.match(mockLib.validateOnlineMock({ ...input, reading_test_id: "partial" }, catalog), /Reading/);
  assert.match(mockLib.validateOnlineMock({ ...input, writing_task_1_id: "task2" }, catalog), /Task 1/);
  assert.match(mockLib.validateOnlineMock({ ...input, title: " " }, catalog), /title/);
});

test("writing catalog loads every page and retains no answer or prompt fields", async () => {
  const requests = [];
  const library = loadModule("lib/online-mock-api.ts", {
    ...baseMocks,
    "@/lib/api": { adminApi: { listTests: async () => Array.from({ length: 130 }, (_, index) => ({ ...catalog.tests[0], id: `test-${index}` })) } },
    "@/lib/writing-api": { writingApi: { listTasks: async (params) => {
      requests.push(params);
      return { total: 101, items: Array.from({ length: params.page === 1 ? 100 : 1 }, (_, index) => ({
        ...catalog.writingTasks[0], id: `task-${params.page}-${index}`, prompt_html: "private prompt", sample_answer: "private answer",
      })) };
    } } },
  });
  const loaded = await library.loadOnlineMockCatalog();
  assert.equal(loaded.tests.length, 130);
  assert.equal(loaded.writingTasks.length, 101);
  assert.deepEqual(requests, [{ status: "published", page: 1, page_size: 100 }, { status: "published", page: 2, page_size: 100 }]);
  assert.deepEqual(Object.keys(loaded.writingTasks[0]), ["id", "title", "task_type", "status"]);
});

test("online API paginates bundles and publishes/unpublishes without sending content or stale references", async () => {
  const requests = [];
  const library = loadModule("lib/online-mock-api.ts", {
    ...baseMocks,
    "@/lib/auth": { fetchAdminApi: async (url, init) => {
      requests.push({ url, method: init.method ?? "GET", body: init.body ? JSON.parse(init.body) : undefined });
      return { ok: true, json: async () => init.method ? { ...input, id: "bundle", module: "academic", ...JSON.parse(init.body) }
        : { items: [{ ...input, id: url.includes("page=1") ? "first" : "last", module: "academic" }], total: 2 } };
    } },
  });
  assert.equal((await library.onlineMockApi.list()).length, 2);
  assert.ok(requests[1].url.endsWith("?page=2&page_size=100"));
  await library.onlineMockApi.create({ ...input, is_published: true, academic_confirmed: true });
  assert.deepEqual(requests.at(-1).body, { ...input, is_published: true, academic_confirmed: true });
  assert.equal(requests.at(-1).method, "POST");
  await library.onlineMockApi.update("bundle", { is_published: false });
  assert.deepEqual(requests.at(-1), {
    url: "http://admin.test/api/admin/mock/online-mocks/bundle", method: "PATCH", body: { is_published: false },
  });
});

test("online API surfaces backend eligibility and validation failures without fallback records", async () => {
  const library = loadModule("lib/online-mock-api.ts", {
    ...baseMocks,
    "@/lib/auth": { fetchAdminApi: async () => ({ ok: false, status: 422, json: async () => ({ detail: "A selected component is no longer published." }) }) },
  });
  await assert.rejects(library.onlineMockApi.create(input), /no longer published/);
});

test("offline API maps exact seat counts and distinguishes omitted addresses from explicit clearing", async () => {
  const requests = [];
  const row = {
    id: "schedule", title: "Offline mock", starts_at: "2026-10-01T06:00:00Z", duration_minutes: 180,
    location: "Venue", address: "Building A", capacity: 12, reserved_count: 7, available_seats: 5,
    price_amount: "100000", currency: "UZS", is_published: false,
  };
  const { adminApi } = loadModule("lib/api.ts", {
    "@/lib/public-api": baseMocks["@/lib/public-api"],
    "@/lib/auth": { fetchAdminApi: async (url, init) => {
      const body = init.body ? JSON.parse(init.body) : undefined;
      requests.push({ url, method: init.method ?? "GET", body });
      return { ok: true, json: async () => body ? { ...row, ...body } : { items: [row] } };
    } },
  });
  const [schedule] = await adminApi.listOfflineMockSchedules();
  assert.equal(schedule.capacity, 12);
  assert.equal(schedule.reservedCount, 7);
  assert.equal(schedule.availableSeats, 5);
  assert.equal(schedule.address, "Building A");
  const payload = { title: schedule.title, startsAt: schedule.startsAt, durationMinutes: schedule.durationMinutes,
    location: schedule.location, capacity: schedule.capacity, priceAmount: schedule.priceAmount, isPublished: false };
  await adminApi.updateOfflineMockSchedule(row.id, payload);
  assert.equal(Object.hasOwn(requests.at(-1).body, "address"), false);
  await adminApi.updateOfflineMockSchedule(row.id, { ...payload, address: null });
  assert.equal(requests.at(-1).body.address, null);
  await adminApi.createOfflineMockSchedule({ ...payload, address: "Building B" });
  assert.equal(requests.at(-1).method, "POST");
  assert.equal(requests.at(-1).body.address, "Building B");
});

function descendants(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children)];
}

function textContent(node) {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node !== "object") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  return textContent(node.props?.children);
}

function componentHarness(relativePath, exportName, initialStates, mocks) {
  const states = { ...initialStates };
  let index = 0;
  const ui = new Proxy({ cn: (...args) => args.filter(Boolean).join(" ") }, { get: (target, name) => target[name] ?? name });
  const component = loadModule(relativePath, {
    react: {
      useEffect: () => {},
      useState: (initial) => {
        const key = index++;
        if (!Object.hasOwn(states, key)) states[key] = typeof initial === "function" ? initial() : initial;
        return [states[key], (next) => { states[key] = typeof next === "function" ? next(states[key]) : next; }];
      },
    },
    "next/link": { default: "Link" },
    "lucide-react": new Proxy({}, { get: (_, key) => key }),
    "@/components/ui": ui,
    "@/components/mock-section-nav": { MockSectionNav: "MockSectionNav" },
    ...mocks,
  })[exportName];
  return {
    render() { index = 0; return descendants(component()); },
    states,
  };
}

const settle = () => new Promise((resolve) => setImmediate(resolve));

test("online editor creates and edits real-reference bundles with nullable descriptions and confirmation", async () => {
  const requests = [];
  const harness = componentHarness("components/online-full-mock-manager.tsx", "OnlineFullMockManager", { 0: [], 1: catalog, 4: false }, {
    "@/lib/online-mock-api": { ...mockLib, onlineMockApi: {
      create: async (payload) => { requests.push(["create", payload]); return { ...payload, id: "bundle", module: "academic" }; },
      update: async (id, payload) => { requests.push(["update", id, payload]); return { ...payload, id, module: "academic" }; },
    } },
  });
  let nodes = harness.render();
  nodes.find((node) => node.props?.id === "full-mock-title").props.onChange({ target: { value: "Browser-ready bundle" } });
  for (const { key } of mockLib.MOCK_COMPONENTS) {
    nodes = harness.render();
    nodes.find((node) => node.props?.id === key).props.onChange({ target: { value: input[key] } });
  }
  nodes = harness.render();
  assert.equal(nodes.find((node) => node.type === "Button" && textContent(node) === "Publish Full Mock").props.disabled, true);
  nodes.find((node) => node.props?.type === "checkbox").props.onChange({ target: { checked: true } });
  harness.render().find((node) => node.type === "Button" && textContent(node) === "Publish Full Mock").props.onClick();
  await settle();
  assert.deepEqual(requests[0], ["create", { ...input, title: "Browser-ready bundle", is_published: true, academic_confirmed: true }]);
  nodes = harness.render();
  nodes.find((node) => node.props?.id === "full-mock-title").props.onChange({ target: { value: "Edited bundle" } });
  harness.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  await settle();
  assert.equal(requests[1][0], "update");
  assert.equal(requests[1][1], "bundle");
  assert.equal(requests[1][2].title, "Edited bundle");
  assert.equal(requests[1][2].academic_confirmed, true);
  nodes = harness.render();
  nodes.find((node) => node.props?.id === "reading_test_id").props.onChange({ target: { value: "" } });
  assert.equal(harness.render().find((node) => node.props?.type === "checkbox").props.checked, false);
});

test("withdrawn source components do not block the status-only unpublish action", async () => {
  const bundle = { ...input, id: "bundle", module: "academic", is_published: true, academic_confirmed: true };
  const requests = [];
  const harness = componentHarness("components/online-full-mock-manager.tsx", "OnlineFullMockManager", { 0: [bundle], 1: { tests: [], writingTasks: [] }, 4: false }, {
    "@/lib/online-mock-api": { ...mockLib, onlineMockApi: { update: async (id, payload) => {
      requests.push([id, payload]); return { ...bundle, ...payload };
    } } },
  });
  harness.render().find((node) => node.type === "button" && node.props["aria-pressed"] === false).props.onClick();
  harness.render().find((node) => node.type === "Button" && textContent(node) === "Unpublish").props.onClick();
  await settle();
  assert.deepEqual(requests, [["bundle", { is_published: false }]]);
});

test("offline editing preserves exact seat counts and keeps address separate from location", async () => {
  const schedule = {
    id: "schedule", title: "Offline mock", startsAt: "2026-10-01T06:00:00Z", durationMinutes: 180,
    location: "Venue", address: "Building A", capacity: 12, reservedCount: 7, availableSeats: 5,
    priceAmount: 100000, currency: "UZS", isPublished: false,
  };
  const requests = [];
  const harness = componentHarness("components/mock-schedule-manager.tsx", "MockScheduleManager", {
    0: "2026-10-01", 1: { year: 2026, month: 9 }, 2: [schedule], 5: false,
  }, {
    "@/lib/api": { adminApi: { updateOfflineMockSchedule: async (id, payload) => {
      requests.push([id, payload]); return { ...schedule, ...payload };
    } } },
  });
  let nodes = harness.render();
  assert.match(textContent(nodes[0]), /5 available \/ 12 total seats/);
  assert.match(textContent(nodes[0]), /7 reserved/);
  assert.match(textContent(nodes[0]), /Reading, Listening, Writing, and Speaking included/);
  assert.ok(nodes.some((node) => node.type === "Badge" && textContent(node) === "Academic"));
  nodes.find((node) => node.type === "Button" && node.props["aria-label"]?.startsWith("Edit ")).props.onClick();
  nodes = harness.render();
  assert.equal(nodes.find((node) => node.props?.id === "mock-address").props.value, "Building A");
  nodes.find((node) => node.props?.id === "mock-address").props.onChange({ target: { value: "Building B" } });
  harness.render().find((node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  await settle();
  assert.equal(requests[0][1].address, "Building B");
  assert.equal(requests[0][1].location, "Venue");
  assert.equal(requests[0][1].capacity, 12);
});
