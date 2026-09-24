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

const policy = loadModule("lib/ai-providers.ts");
const writingUseCases = ["writing_grader", "writing_improver", "writing_roast"];
const otherUseCases = ["admin_chat", "writing_image_summary", "audio_transcription", "speaking_examiner", "speaking_grader"];
const provider = {
  id: "provider-db-id", provider: "gpu_uz", label: "GPU.uz", has_api_key: true,
  base_url: "https://aisha-llmv1.inference.gpu.uz/v1", is_enabled: true,
};
const model = {
  id: "model-db-id", model_id: "google/gemma-4-31B-it", display_name: "Gemma 4 31B",
  context_window: 131072, capabilities: { text: true, vision: false, audio: false },
  is_accessible: true, is_selectable: true, sort_order: 0,
};
const availableModel = { id: model.id, displayName: model.display_name, isAccessible: true, isSelectable: true };
const unavailableModels = [
  { ...availableModel, id: "inaccessible", isAccessible: false },
  { ...availableModel, id: "unselectable", isSelectable: false },
];

test("GPU.uz has a default label and preserves configured labels", () => {
  assert.equal(policy.getAiProviderLabel("gpu_uz"), "GPU.uz");
  assert.equal(policy.getAiProviderLabel("gpu_uz", " "), "GPU.uz");
  assert.equal(policy.getAiProviderLabel("gpu_uz", "Custom GPU"), "Custom GPU");
});

test("GPU.uz eligibility is writing-only without changing other providers", () => {
  for (const useCase of writingUseCases) assert.equal(policy.isAiProviderEligible("gpu_uz", useCase), true);
  for (const useCase of otherUseCases) assert.equal(policy.isAiProviderEligible("gpu_uz", useCase), false);
  for (const existing of ["google", "cerebras", "groq"]) {
    for (const useCase of [...writingUseCases, ...otherUseCases]) {
      assert.equal(policy.isAiProviderEligible(existing, useCase), true);
    }
  }
});

test("selection skips inaccessible and unselectable models without mutating catalog rows", () => {
  const models = [...unavailableModels, availableModel];
  for (const existing of ["google", "cerebras", "groq", "gpu_uz"]) {
    assert.deepEqual(policy.getSelectableAiModels(existing, "writing_grader", models), [availableModel]);
  }
  assert.deepEqual(policy.getSelectableAiModels("gpu_uz", "writing_image_summary", models), []);
  assert.deepEqual(policy.getSelectableAiModels("gpu_uz", "writing_grader", []), []);
  assert.equal(models.length, 3);
});

test("GPU.uz config, validation, model fetch, and writing bindings use backend records and IDs", async () => {
  const calls = [];
  const { adminApi } = loadModule("lib/api.ts", {
    "@/lib/public-api": { ADMIN_PUBLIC_API_BASE_URL: "http://admin.test/api/admin" },
    "@/lib/auth": {
      fetchAdminApi: async (url, init) => {
        const route = url.replace("http://admin.test/api/admin", "");
        const body = init.body ? JSON.parse(init.body) : undefined;
        calls.push({ route, method: init.method ?? "GET", body });
        let response;
        if (route === "/ai/providers") response = [provider];
        else if (route.endsWith("/validate")) response = { ok: true, message: "OK", models_seen: 1 };
        else if (route.endsWith("/models") || route.endsWith("/sync-models")) response = [model];
        else if (route === "/ai/providers/gpu_uz") response = provider;
        else if (route.startsWith("/ai/use-cases/")) response = {
          use_case: route.split("/").at(-1), provider: "gpu_uz", provider_label: provider.label,
          provider_config_id: body.provider_config_id, provider_model_id: body.provider_model_id,
          model_id: model.model_id, model_display_name: model.display_name, settings_json: body.settings_json,
        };
        else throw new Error(`Unexpected route: ${route}`);
        return { ok: true, json: async () => response };
      },
    },
  });
  const [config] = await adminApi.listAiProviders();
  assert.equal(config.provider, "gpu_uz");
  assert.equal(config.label, "GPU.uz");
  assert.equal(config.baseUrl, provider.base_url);
  await adminApi.updateAiProvider("gpu_uz", { label: config.label, apiKey: "test-key", baseUrl: config.baseUrl, isEnabled: true });
  assert.deepEqual(calls.at(-1), {
    route: "/ai/providers/gpu_uz", method: "PATCH",
    body: { label: "GPU.uz", api_key: "test-key", base_url: provider.base_url, is_enabled: true },
  });
  assert.equal((await adminApi.validateAiProvider("gpu_uz", { apiKey: "test-key", baseUrl: config.baseUrl })).modelsSeen, 1);
  assert.deepEqual(calls.at(-1), {
    route: "/ai/providers/gpu_uz/validate", method: "POST",
    body: { api_key: "test-key", base_url: provider.base_url },
  });
  const synced = await adminApi.syncAiProviderModels("gpu_uz");
  assert.equal(calls.at(-1).route, "/ai/providers/gpu_uz/sync-models");
  assert.equal(calls.at(-1).method, "POST");
  const listed = await adminApi.listAiProviderModels("gpu_uz");
  assert.equal(calls.at(-1).route, "/ai/providers/gpu_uz/models");
  assert.equal(calls.at(-1).method, "GET");
  assert.deepEqual(listed, synced);
  assert.equal(listed[0].id, model.id);
  assert.equal(listed[0].modelId, model.model_id);
  assert.equal(listed[0].contextWindow, 131072);
  assert.deepEqual(listed[0].capabilities, model.capabilities);
  for (const useCase of writingUseCases) {
    const binding = await adminApi.updateAiUseCase(useCase, {
      providerConfigId: config.id, providerModelId: listed[0].id, settingsJson: { temperature: 0.2 },
    });
    assert.deepEqual(calls.at(-1), {
      route: `/ai/use-cases/${useCase}`, method: "PATCH",
      body: { provider_config_id: provider.id, provider_model_id: model.id, settings_json: { temperature: 0.2 } },
    });
    assert.equal(binding.provider, "gpu_uz");
    assert.equal(binding.providerLabel, "GPU.uz");
    assert.equal(binding.modelId, model.model_id);
  }
});

function descendants(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(descendants);
  return [node, ...descendants(node.props?.children)];
}

function renderDashboard(useCase, { boundProvider = "google", gpuModels = [...unavailableModels, availableModel], gpuEnabled = true, providerDrafts = {} } = {}) {
  const calls = [];
  const providers = [
    { id: "google-db", provider: "google", label: "Google", isEnabled: true },
    { id: provider.id, provider: "gpu_uz", label: "GPU.uz", isEnabled: gpuEnabled },
  ];
  const binding = { useCase, providerConfigId: boundProvider === "google" ? "google-db" : provider.id, provider: boundProvider, providerModelId: "old-model", modelDisplayName: "Existing model", settingsJson: { temperature: 0.2 } };
  const states = {
    0: providers,
    1: providerDrafts,
    2: { google: [{ ...availableModel, id: "old-model", displayName: "Existing model", isSelectable: false }], gpu_uz: gpuModels },
    3: [binding],
  };
  let stateIndex = 0;
  const { AiSettingsDashboard } = loadModule("components/ai-settings-dashboard.tsx", {
    react: {
      useState: (initial) => [states[stateIndex++] ?? (initial === true ? false : initial), () => {}],
      useEffect: () => {}, useMemo: (fn) => fn(),
    },
    "@/components/ui": new Proxy({}, { get: (_, name) => name }),
    "@/components/loading-skeletons": {},
    "@/lib/api": { adminApi: { updateAiUseCase: async (...args) => { calls.push(args); return binding; } } },
  });
  return { nodes: descendants(AiSettingsDashboard()), calls };
}

test("dashboard auto-selection uses the first available model and preserves settings", () => {
  const { nodes, calls } = renderDashboard("writing_grader");
  const [providerSelect, modelSelect] = nodes.filter((node) => node.type === "Select");
  assert.equal(modelSelect.props.value, "");
  assert.equal(modelSelect.props.disabled, true);
  assert.ok(nodes.some((node) => node.props?.children === "Existing model"));
  assert.equal(calls.length, 0);
  providerSelect.props.onChange({ target: { value: provider.id } });
  assert.deepEqual(calls, [["writing_grader", {
    providerConfigId: provider.id, providerModelId: model.id, settingsJson: { temperature: 0.2 },
  }]]);
});

test("dashboard does not offer GPU.uz for vision, audio, or speaking bindings", () => {
  for (const useCase of otherUseCases.filter((item) => item !== "admin_chat")) {
    const { nodes, calls } = renderDashboard(useCase);
    const [providerSelect] = nodes.filter((node) => node.type === "Select");
    assert.equal(descendants(providerSelect).some((node) => node.type === "option" && node.props.value === provider.id), false);
    providerSelect.props.onChange({ target: { value: provider.id } });
    assert.equal(calls.length, 0);
  }
});

test("dashboard model dropdown filters unavailable rows and rejects invalid selections", () => {
  const { nodes, calls } = renderDashboard("writing_improver", { boundProvider: "gpu_uz" });
  const [, modelSelect] = nodes.filter((node) => node.type === "Select");
  const optionIds = descendants(modelSelect).filter((node) => node.type === "option").map((node) => node.props.value);
  assert.deepEqual(optionIds, ["", model.id]);
  for (const id of ["inaccessible", "unselectable", "missing"]) {
    modelSelect.props.onChange({ target: { value: id } });
  }
  assert.equal(calls.length, 0);
  modelSelect.props.onChange({ target: { value: model.id } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].providerModelId, model.id);
});

test("dashboard disables providers with no selectable models and never synthesizes a model", () => {
  for (const gpuModels of [[], unavailableModels]) {
    const { nodes, calls } = renderDashboard("writing_roast", { gpuModels });
    const [providerSelect] = nodes.filter((node) => node.type === "Select");
    const gpuOption = descendants(providerSelect).find((node) => node.type === "option" && node.props.value === provider.id);
    assert.equal(gpuOption.props.disabled, true);
    providerSelect.props.onChange({ target: { value: provider.id } });
    assert.equal(calls.length, 0);
  }
});

test("disabled providers cannot be selected for new bindings even with available models", () => {
  const { nodes, calls } = renderDashboard("writing_grader", { gpuEnabled: false });
  const [providerSelect] = nodes.filter((node) => node.type === "Select");
  const gpuOption = descendants(providerSelect).find((node) => node.type === "option" && node.props.value === provider.id);
  assert.equal(gpuOption.props.disabled, true);
  assert.match(gpuOption.props.children.join(""), /enable and save first/);
  const enabledCheckbox = nodes.find((node) => node.props?.id === "provider-enabled-gpu_uz");
  assert.equal(enabledCheckbox.props.type, "checkbox");
  assert.equal(enabledCheckbox.props.checked, false);
  providerSelect.props.onChange({ target: { value: provider.id } });
  assert.equal(calls.length, 0);
});

test("disabled current bindings stay visible but cannot change models until enabled and saved", () => {
  const { nodes, calls } = renderDashboard("writing_roast", {
    boundProvider: "gpu_uz", gpuEnabled: false,
    gpuModels: [{ ...availableModel, id: "old-model", displayName: "Existing model" }, availableModel],
    providerDrafts: { gpu_uz: { label: "GPU.uz", apiKey: "", baseUrl: provider.base_url, isEnabled: true } },
  });
  const [providerSelect, modelSelect] = nodes.filter((node) => node.type === "Select");
  assert.equal(providerSelect.props.value, provider.id);
  assert.equal(modelSelect.props.value, "old-model");
  assert.equal(modelSelect.props.disabled, true);
  assert.ok(nodes.some((node) => node.props?.children === "Existing model"));
  assert.ok(nodes.some((node) => node.type === "p" && Array.isArray(node.props.children)
    && node.props.children.join("").includes("Enable and save GPU.uz above")));
  assert.equal(nodes.find((node) => node.props?.id === "provider-enabled-gpu_uz").props.checked, true);
  modelSelect.props.onChange({ target: { value: model.id } });
  assert.equal(calls.length, 0);
});
