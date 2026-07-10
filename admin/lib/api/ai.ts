import { requestJson } from "@/lib/api/core";
import type {
  AdminAiProviderConfig,
  AdminAiProviderModel,
  AdminAiUseCaseBinding,
} from "@/lib/types";

interface BackendProviderConfig {
  id: string;
  provider: "google" | "cerebras" | "groq";
  label: string;
  api_key_masked?: string | null;
  has_api_key: boolean;
  base_url?: string | null;
  is_enabled: boolean;
  last_sync_at?: string | null;
  last_sync_status?: string | null;
  last_sync_error?: string | null;
}

interface BackendProviderModel {
  id: string;
  model_id: string;
  display_name: string;
  family?: string | null;
  capabilities?: Record<string, unknown> | null;
  context_window?: number | null;
  is_accessible: boolean;
  is_selectable: boolean;
  sort_order: number;
}

interface BackendUseCaseBinding {
  id?: string | null;
  use_case: AdminAiUseCaseBinding["useCase"];
  provider_config_id?: string | null;
  provider?: AdminAiProviderConfig["provider"] | null;
  provider_label?: string | null;
  provider_model_id?: string | null;
  model_id?: string | null;
  model_display_name?: string | null;
  settings_json?: Record<string, unknown> | null;
  resolved_source?: string;
}

function mapProviderConfig(
  config: BackendProviderConfig,
): AdminAiProviderConfig {
  return {
    id: config.id,
    provider: config.provider,
    label: config.label,
    apiKeyMasked: config.api_key_masked ?? null,
    hasApiKey: config.has_api_key,
    baseUrl: config.base_url ?? null,
    isEnabled: config.is_enabled,
    lastSyncAt: config.last_sync_at ?? null,
    lastSyncStatus: config.last_sync_status ?? null,
    lastSyncError: config.last_sync_error ?? null,
  };
}

function mapProviderModel(model: BackendProviderModel): AdminAiProviderModel {
  return {
    id: model.id,
    modelId: model.model_id,
    displayName: model.display_name,
    family: model.family ?? null,
    capabilities: model.capabilities ?? {},
    contextWindow: model.context_window ?? null,
    isAccessible: model.is_accessible,
    isSelectable: model.is_selectable,
    sortOrder: model.sort_order,
  };
}

function mapUseCaseBinding(
  binding: BackendUseCaseBinding,
): AdminAiUseCaseBinding {
  return {
    id: binding.id ?? null,
    useCase: binding.use_case,
    providerConfigId: binding.provider_config_id ?? null,
    provider: binding.provider ?? null,
    providerLabel: binding.provider_label ?? null,
    providerModelId: binding.provider_model_id ?? null,
    modelId: binding.model_id ?? null,
    modelDisplayName: binding.model_display_name ?? null,
    settingsJson: binding.settings_json ?? {},
    resolvedSource: binding.resolved_source ?? "missing",
  };
}

export const aiApi = {
  async listAiProviders(): Promise<AdminAiProviderConfig[]> {
    const response = await requestJson<BackendProviderConfig[]>("/ai/providers");
    return response.map(mapProviderConfig);
  },

  async updateAiProvider(
    provider: AdminAiProviderConfig["provider"],
    input: {
      label?: string;
      apiKey?: string | null;
      baseUrl?: string | null;
      isEnabled?: boolean;
    },
  ): Promise<AdminAiProviderConfig> {
    const response = await requestJson<BackendProviderConfig>(
      `/ai/providers/${provider}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          label: input.label,
          api_key: input.apiKey ?? undefined,
          base_url: input.baseUrl ?? undefined,
          is_enabled: input.isEnabled,
        }),
      },
    );
    return mapProviderConfig(response);
  },

  async validateAiProvider(
    provider: AdminAiProviderConfig["provider"],
    input: { apiKey?: string | null; baseUrl?: string | null } = {},
  ): Promise<{ ok: boolean; message: string; modelsSeen: number | null }> {
    const response = await requestJson<{
      ok: boolean;
      message: string;
      models_seen?: number | null;
    }>(`/ai/providers/${provider}/validate`, {
      method: "POST",
      body: JSON.stringify({
        api_key: input.apiKey ?? undefined,
        base_url: input.baseUrl ?? undefined,
      }),
    });
    return {
      ok: response.ok,
      message: response.message,
      modelsSeen: response.models_seen ?? null,
    };
  },

  async syncAiProviderModels(
    provider: AdminAiProviderConfig["provider"],
  ): Promise<AdminAiProviderModel[]> {
    const response = await requestJson<BackendProviderModel[]>(
      `/ai/providers/${provider}/sync-models`,
      { method: "POST" },
    );
    return response.map(mapProviderModel);
  },

  async listAiProviderModels(
    provider: AdminAiProviderConfig["provider"],
  ): Promise<AdminAiProviderModel[]> {
    const response = await requestJson<BackendProviderModel[]>(
      `/ai/providers/${provider}/models`,
    );
    return response.map(mapProviderModel);
  },

  async listAiUseCases(): Promise<AdminAiUseCaseBinding[]> {
    const response = await requestJson<BackendUseCaseBinding[]>("/ai/use-cases");
    return response.map(mapUseCaseBinding);
  },

  async updateAiUseCase(
    useCase: AdminAiUseCaseBinding["useCase"],
    input: {
      providerConfigId: string;
      providerModelId: string;
      settingsJson?: Record<string, unknown>;
    },
  ): Promise<AdminAiUseCaseBinding> {
    const response = await requestJson<BackendUseCaseBinding>(
      `/ai/use-cases/${useCase}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          provider_config_id: input.providerConfigId,
          provider_model_id: input.providerModelId,
          settings_json: input.settingsJson ?? {},
        }),
      },
    );
    return mapUseCaseBinding(response);
  },
};
