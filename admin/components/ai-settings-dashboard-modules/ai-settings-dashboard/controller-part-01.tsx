"use client";
import type { BaseScope } from "./base";
import { AdminAiProviderConfig, AdminAiProviderModel, AdminAiUseCaseBinding, AdminWritingAnchorSet, AdminWritingConfigAuditEntry, AdminWritingPromptPreview, AdminWritingPromptProfile, AdminWritingRubric, AiProvider, AiUseCase, WritingPromptKey, WritingTaskTypeScope, adminApi, useEffect, useMemo, useState } from "../dependencies";
import { PROMPT_KEYS, ProviderDraft, WRITING_USE_CASES, createProviderDraft } from "../shared";

export function useControllerPart1(scope: BaseScope) {
  const [providers, setProviders] = useState<AdminAiProviderConfig[]>([]);

  const [providerDrafts, setProviderDrafts] = useState<Record<string, ProviderDraft>>({});

  const [modelsByProvider, setModelsByProvider] = useState<Partial<Record<AiProvider, AdminAiProviderModel[]>>>({});

  const [useCases, setUseCases] = useState<AdminAiUseCaseBinding[]>([]);

  const [useCaseSettingsDrafts, setUseCaseSettingsDrafts] = useState<Partial<Record<AiUseCase, string>>>({});

  const [profiles, setProfiles] = useState<AdminWritingPromptProfile[]>([]);

  const [rubrics, setRubrics] = useState<AdminWritingRubric[]>([]);

  const [anchorSets, setAnchorSets] = useState<AdminWritingAnchorSet[]>([]);

  const [auditEntries, setAuditEntries] = useState<AdminWritingConfigAuditEntry[]>([]);

  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  const [preview, setPreview] = useState<AdminWritingPromptPreview | null>(null);

  const [notice, setNotice] = useState<{ title: string; description: string; tone: "success" | "warning" } | null>(null);

  const [loading, setLoading] = useState(true);

  const [busyKey, setBusyKey] = useState<string | null>(null);

  const [previewDraft, setPreviewDraft] = useState({
      taskType: "task_2" as WritingTaskTypeScope,
      taskPromptText: "Some people think online learning is better than classroom learning. Discuss both views and give your opinion.",
      imageSummary: "",
      essayText: "Online learning is flexible, but many students still benefit from face-to-face interaction in the classroom.",
    });

  const [newProfileDraft, setNewProfileDraft] = useState({
      slug: "custom-profile",
      title: "Custom Profile",
      taskTypeScope: "all" as WritingTaskTypeScope,
    });

  const selectedProfile = useMemo(
      () => profiles.find((profile) => profile.id === selectedProfileId) ?? profiles[0] ?? null,
      [profiles, selectedProfileId],
    );

  const selectedProfileEntries = useMemo(() => {
      const entriesByKey = new Map((selectedProfile?.entries ?? []).map((entry) => [entry.key, entry]));
      return PROMPT_KEYS.map((key) => entriesByKey.get(key) ?? { key, body: "", format: "text" as const });
    }, [selectedProfile]);

  const writingUseCases = useMemo(
      () => WRITING_USE_CASES
        .map((useCase) => useCases.find((binding) => binding.useCase === useCase))
        .filter((binding): binding is AdminAiUseCaseBinding => Boolean(binding)),
      [useCases],
    );

  const otherUseCases = useMemo(
      () => useCases.filter((binding) => !WRITING_USE_CASES.includes(binding.useCase) && binding.useCase !== "admin_chat"),
      [useCases],
    );

  useEffect(() => {
      if (notice == null) return undefined;
      const timeoutId = window.setTimeout(() => setNotice(null), 3200);
      return () => window.clearTimeout(timeoutId);
    }, [notice]);

  useEffect(() => {
      void refreshAll();
    }, []);

  async function refreshAll() {
      setLoading(true);
      try {
        const [nextProviders, nextUseCases, nextProfiles, nextRubrics, nextAnchorSets, nextAuditEntries] = await Promise.all([
          adminApi.listAiProviders(),
          adminApi.listAiUseCases(),
          adminApi.listWritingPromptProfiles(),
          adminApi.listWritingRubrics(),
          adminApi.listWritingAnchorSets(),
          adminApi.listWritingConfigAuditLog(),
        ]);
        const nextModels = await Promise.all(
          nextProviders.map(async (provider) => [provider.provider, await adminApi.listAiProviderModels(provider.provider)] as const),
        );
        setProviders(nextProviders);
        setProviderDrafts(Object.fromEntries(nextProviders.map((provider) => [provider.provider, createProviderDraft(provider)])));
        setUseCases(nextUseCases);
        setUseCaseSettingsDrafts(Object.fromEntries(nextUseCases.map((binding) => [
          binding.useCase,
          JSON.stringify(binding.settingsJson ?? {}, null, 2),
        ])) as Partial<Record<AiUseCase, string>>);
        setProfiles(nextProfiles);
        setRubrics(nextRubrics);
        setAnchorSets(nextAnchorSets);
        setAuditEntries(nextAuditEntries);
        setModelsByProvider(Object.fromEntries(nextModels) as Partial<Record<AiProvider, AdminAiProviderModel[]>>);
        setSelectedProfileId((current) => current || nextProfiles[0]?.id || "");
      } catch (error) {
        setNotice({
          tone: "warning",
          title: "AI settings failed",
          description: error instanceof Error ? error.message : "The AI settings workspace could not be loaded.",
        });
      } finally {
        setLoading(false);
      }
    }

  function setProviderDraft(provider: AiProvider, patch: Partial<ProviderDraft>) {
      setProviderDrafts((current) => ({
        ...current,
        [provider]: {
          ...(current[provider] ?? { label: provider, apiKey: "", baseUrl: "", isEnabled: false }),
          ...patch,
        },
      }));
    }

  function updateSelectedPromptEntry(key: WritingPromptKey, body: string) {
      if (!selectedProfile) return;
      setProfiles((current) => current.map((item) => {
        if (item.id !== selectedProfile.id) return item;
        const exists = item.entries.some((entry) => entry.key === key);
        return {
          ...item,
          entries: exists
            ? item.entries.map((entry) => entry.key === key ? { ...entry, body } : entry)
            : [...item.entries, { key, body, format: "text" }],
        };
      }));
    }

  async function handleSaveProvider(provider: AiProvider) {
      const draft = providerDrafts[provider];
      if (!draft) return;
      setBusyKey(`provider-save-${provider}`);
      try {
        const nextProvider = await adminApi.updateAiProvider(provider, {
          label: draft.label,
          apiKey: draft.apiKey.trim() || undefined,
          baseUrl: draft.baseUrl.trim() || undefined,
          isEnabled: draft.isEnabled,
        });
        setProviders((current) => current.map((item) => (item.provider === provider ? nextProvider : item)));
        setProviderDraft(provider, { apiKey: "" });
        setNotice({ tone: "success", title: "Provider saved", description: `${nextProvider.label} settings were updated.` });
      } catch (error) {
        setNotice({ tone: "warning", title: "Provider save failed", description: error instanceof Error ? error.message : "Provider save failed." });
      } finally {
        setBusyKey(null);
      }
    }

  async function handleValidateProvider(provider: AiProvider) {
      const draft = providerDrafts[provider];
      setBusyKey(`provider-validate-${provider}`);
      try {
        const result = await adminApi.validateAiProvider(provider, {
          apiKey: draft?.apiKey.trim() || undefined,
          baseUrl: draft?.baseUrl.trim() || undefined,
        });
        setNotice({ tone: "success", title: "Credentials look valid", description: `${provider} responded with ${result.modelsSeen ?? 0} visible model(s).` });
      } catch (error) {
        setNotice({ tone: "warning", title: "Validation failed", description: error instanceof Error ? error.message : "Validation failed." });
      } finally {
        setBusyKey(null);
      }
    }

  async function handleSyncProvider(provider: AiProvider) {
      setBusyKey(`provider-sync-${provider}`);
      try {
        const models = await adminApi.syncAiProviderModels(provider);
        setModelsByProvider((current) => ({ ...current, [provider]: models }));
        const nextProviders = await adminApi.listAiProviders();
        setProviders(nextProviders);
        setNotice({ tone: "success", title: "Models fetched", description: `${provider} returned ${models.length} model rows.` });
      } catch (error) {
        setNotice({ tone: "warning", title: "Sync failed", description: error instanceof Error ? error.message : "Model sync failed." });
      } finally {
        setBusyKey(null);
      }
    }

  async function handleUseCaseChange(
      useCase: AiUseCase,
      providerConfigId: string,
      providerModelId: string,
      settingsJson?: Record<string, unknown>,
    ) {
      setBusyKey(`usecase-${useCase}`);
      try {
        const nextBinding = await adminApi.updateAiUseCase(useCase, { providerConfigId, providerModelId, settingsJson });
        setUseCases((current) => current.map((item) => (item.useCase === useCase ? nextBinding : item)));
        setUseCaseSettingsDrafts((current) => ({
          ...current,
          [useCase]: JSON.stringify(nextBinding.settingsJson ?? {}, null, 2),
        }));
        setNotice({ tone: "success", title: "Use-case updated", description: `${useCase} now points to ${nextBinding.modelDisplayName ?? "the selected model"}.` });
      } catch (error) {
        setNotice({ tone: "warning", title: "Use-case update failed", description: error instanceof Error ? error.message : "Use-case update failed." });
      } finally {
        setBusyKey(null);
      }
    }

  return { providers, setProviders, providerDrafts, setProviderDrafts, modelsByProvider, setModelsByProvider, useCases, setUseCases, useCaseSettingsDrafts, setUseCaseSettingsDrafts, profiles, setProfiles, rubrics, setRubrics, anchorSets, setAnchorSets, auditEntries, setAuditEntries, selectedProfileId, setSelectedProfileId, preview, setPreview, notice, setNotice, loading, setLoading, busyKey, setBusyKey, previewDraft, setPreviewDraft, newProfileDraft, setNewProfileDraft, selectedProfile, selectedProfileEntries, writingUseCases, otherUseCases, refreshAll, setProviderDraft, updateSelectedPromptEntry, handleSaveProvider, handleValidateProvider, handleSyncProvider, handleUseCaseChange };
}

export type Part1Scope = ReturnType<typeof useControllerPart1>;
