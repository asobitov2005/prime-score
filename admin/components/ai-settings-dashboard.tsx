"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Label, Notice, SectionHeader, Select, Textarea } from "@/components/ui";
import { adminApi } from "@/lib/api";
import type {
  AdminAiProviderConfig,
  AdminAiProviderModel,
  AdminAiUseCaseBinding,
  AdminWritingAnchorSet,
  AdminWritingConfigAuditEntry,
  AdminWritingPromptPreview,
  AdminWritingPromptProfile,
  AdminWritingRubric,
  AiProvider,
  AiUseCase,
  WritingPromptKey,
  WritingTaskTypeScope,
} from "@/lib/types";

const PROMPT_KEYS: WritingPromptKey[] = [
  "grader_system",
  "grader_user_template",
  "criterion_task_achievement",
  "criterion_coherence_cohesion",
  "criterion_lexical_resource",
  "criterion_grammar_accuracy",
  "annotation_prompt",
  "annotation_repair_prompt",
  "json_repair_prompt",
  "improved_version_prompt",
  "roast_system",
  "roast_user_template",
  "vocabulary_upgrade_policy",
];

const WRITING_USE_CASES: AiUseCase[] = [
  "writing_grader",
  "writing_improver",
  "writing_roast",
  "writing_image_summary",
];

const USE_CASE_LABELS: Record<AiUseCase, { title: string; description: string }> = {
  admin_chat: {
    title: "Admin chat",
    description: "Legacy admin workspace chat binding.",
  },
  writing_grader: {
    title: "Writing grader",
    description: "Main IELTS band scoring, feedback, criterion scores, and annotations.",
  },
  writing_improver: {
    title: "Writing improved version",
    description: "Rewrites the essay into a stronger version after grading.",
  },
  writing_roast: {
    title: "Writing roast feedback",
    description: "Direct, natural-language roast feedback for writing results.",
  },
  writing_image_summary: {
    title: "Writing Task 1 image summary",
    description: "Vision model used to read/summarize Task 1 chart or image prompts.",
  },
  audio_transcription: {
    title: "Audio transcription",
    description: "Listening audio transcript generation.",
  },
};

const PROMPT_LABELS: Record<WritingPromptKey, { title: string; description: string; rows: number }> = {
  grader_system: {
    title: "Grader system prompt",
    description: "Main system instruction used by the IELTS writing grader.",
    rows: 10,
  },
  grader_user_template: {
    title: "Grader user template",
    description: "User prompt template. Keep required placeholders intact.",
    rows: 12,
  },
  criterion_task_achievement: {
    title: "Criterion: Task Achievement / Response",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  criterion_coherence_cohesion: {
    title: "Criterion: Coherence and Cohesion",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  criterion_lexical_resource: {
    title: "Criterion: Lexical Resource",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  criterion_grammar_accuracy: {
    title: "Criterion: Grammar Accuracy",
    description: "Criterion-specific grading policy.",
    rows: 5,
  },
  annotation_prompt: {
    title: "Annotation prompt",
    description: "Prompt for essay issue annotations.",
    rows: 8,
  },
  annotation_repair_prompt: {
    title: "Annotation repair prompt",
    description: "Used to repair malformed annotation JSON.",
    rows: 6,
  },
  json_repair_prompt: {
    title: "JSON repair prompt",
    description: "General JSON repair instruction.",
    rows: 6,
  },
  improved_version_prompt: {
    title: "Improved version prompt",
    description: "Prompt used to rewrite/improve submitted writing.",
    rows: 8,
  },
  roast_system: {
    title: "Roast system prompt",
    description: "System instruction for roast feedback.",
    rows: 8,
  },
  roast_user_template: {
    title: "Roast user template",
    description: "User template for roast feedback.",
    rows: 10,
  },
  vocabulary_upgrade_policy: {
    title: "Vocabulary upgrade policy",
    description: "Policy block used when suggesting vocabulary upgrades.",
    rows: 6,
  },
};

type ProviderDraft = {
  label: string;
  apiKey: string;
  baseUrl: string;
  isEnabled: boolean;
};

function createProviderDraft(provider: AdminAiProviderConfig): ProviderDraft {
  return {
    label: provider.label,
    apiKey: "",
    baseUrl: provider.baseUrl ?? "",
    isEnabled: provider.isEnabled,
  };
}

function toneForSync(status: string | null): "neutral" | "success" | "warning" | "danger" {
  if (status === "success") return "success";
  if (status === "failed") return "danger";
  if (status === "running") return "warning";
  return "neutral";
}

export function AiSettingsDashboard() {
  const [providers, setProviders] = useState<AdminAiProviderConfig[]>([]);
  const [providerDrafts, setProviderDrafts] = useState<Record<string, ProviderDraft>>({});
  const [modelsByProvider, setModelsByProvider] = useState<Partial<Record<AiProvider, AdminAiProviderModel[]>>>({});
  const [useCases, setUseCases] = useState<AdminAiUseCaseBinding[]>([]);
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

  async function handleUseCaseChange(useCase: AiUseCase, providerConfigId: string, providerModelId: string) {
    setBusyKey(`usecase-${useCase}`);
    try {
      const nextBinding = await adminApi.updateAiUseCase(useCase, { providerConfigId, providerModelId });
      setUseCases((current) => current.map((item) => (item.useCase === useCase ? nextBinding : item)));
      setNotice({ tone: "success", title: "Use-case updated", description: `${useCase} now points to ${nextBinding.modelDisplayName ?? "the selected model"}.` });
    } catch (error) {
      setNotice({ tone: "warning", title: "Use-case update failed", description: error instanceof Error ? error.message : "Use-case update failed." });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleCreateProfile() {
    setBusyKey("profile-create");
    try {
      const created = await adminApi.createWritingPromptProfile({
        slug: newProfileDraft.slug,
        title: newProfileDraft.title,
        taskTypeScope: newProfileDraft.taskTypeScope,
        entries: PROMPT_KEYS.map((key) => ({ key, body: "", format: "text" })),
      });
      setProfiles((current) => [created, ...current]);
      setSelectedProfileId(created.id);
      setNotice({ tone: "success", title: "Draft profile created", description: `${created.title} is ready for editing.` });
    } catch (error) {
      setNotice({ tone: "warning", title: "Profile creation failed", description: error instanceof Error ? error.message : "Profile creation failed." });
    } finally {
      setBusyKey(null);
    }
  }

  async function handleSaveProfile() {
    if (!selectedProfile) return;
    setBusyKey("profile-save");
    try {
      const saved = await adminApi.updateWritingPromptProfile(selectedProfile.id, {
        title: selectedProfile.title,
        description: selectedProfile.description,
        entries: selectedProfile.entries,
      });
      setProfiles((current) => current.map((item) => (item.id === saved.id ? saved : item)));
      setNotice({ tone: "success", title: "Profile saved", description: `${saved.title} was updated.` });
    } catch (error) {
      setNotice({ tone: "warning", title: "Profile save failed", description: error instanceof Error ? error.message : "Profile save failed." });
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePublishProfile() {
    if (!selectedProfile) return;
    setBusyKey("profile-publish");
    try {
      const published = await adminApi.publishWritingPromptProfile(selectedProfile.id);
      setProfiles((current) => current.map((item) => (item.id === published.id ? published : item)));
      setNotice({ tone: "success", title: "Profile published", description: `${published.title} is now active.` });
    } catch (error) {
      setNotice({ tone: "warning", title: "Profile publish failed", description: error instanceof Error ? error.message : "Profile publish failed." });
    } finally {
      setBusyKey(null);
    }
  }

  async function handlePreview() {
    setBusyKey("preview");
    try {
      const nextPreview = await adminApi.previewWritingPrompts(previewDraft);
      setPreview(nextPreview);
    } catch (error) {
      setNotice({ tone: "warning", title: "Preview failed", description: error instanceof Error ? error.message : "Preview failed." });
    } finally {
      setBusyKey(null);
    }
  }

  function renderUseCaseBinding(binding: AdminAiUseCaseBinding) {
    const label = USE_CASE_LABELS[binding.useCase];
    const provider = providers.find((item) => item.id === binding.providerConfigId) ?? providers.find((item) => item.provider === binding.provider);
    const providerId = provider?.id ?? binding.providerConfigId ?? providers[0]?.id ?? "";
    const activeProvider = providers.find((item) => item.id === providerId) ?? providers[0];
    const models = activeProvider ? modelsByProvider[activeProvider.provider] ?? [] : [];
    const modelId = binding.providerModelId ?? models[0]?.id ?? "";
    const activeModel = models.find((model) => model.id === modelId);
    return (
      <div key={binding.useCase} className="rounded-xl border border-border bg-background/45 p-4 shadow-sm transition-colors hover:border-border/80">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{label.title}</p>
              <Badge tone="neutral" className="font-mono text-[10px]">{binding.useCase}</Badge>
            </div>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{label.description}</p>
          </div>
          <div className="min-w-0 rounded-lg border border-border bg-card px-3 py-2 text-xs">
            <p className="font-medium text-muted-foreground">Current</p>
            <p className="mt-1 truncate font-semibold text-foreground">{activeModel?.displayName ?? binding.modelDisplayName ?? "No model selected"}</p>
            <p className="mt-0.5 truncate text-muted-foreground">{activeProvider?.label ?? binding.providerLabel ?? "No provider"} · {binding.resolvedSource}</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 border-t border-border pt-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={providerId} onChange={(event) => {
              const nextProvider = providers.find((item) => item.id === event.target.value);
              const nextModel = nextProvider ? (modelsByProvider[nextProvider.provider] ?? [])[0] : null;
              if (nextProvider && nextModel) {
                void handleUseCaseChange(binding.useCase, nextProvider.id, nextModel.id);
              }
            }}>
              {providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Model</Label>
            <Select value={modelId} onChange={(event) => activeProvider && void handleUseCaseChange(binding.useCase, activeProvider.id, event.target.value)}>
              {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
            </Select>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="space-y-4"><div className="h-12 rounded-xl bg-muted animate-pulse" /><div className="h-80 rounded-xl bg-muted animate-pulse" /></div>;
  }

  return (
    <div className="space-y-8">
      <SectionHeader eyebrow="Writing AI" title="Writing Prompts + AI Settings" description="Edit every writing prompt used by grading, annotation, rewrite, and roast flows. The old chat workspace is disabled." />

      {notice ? <Notice tone={notice.tone} title={notice.title} description={notice.description} /> : null}

      <div className="grid gap-6 xl:grid-cols-2">
        {providers.map((provider) => {
          const draft = providerDrafts[provider.provider] ?? createProviderDraft(provider);
          const models = modelsByProvider[provider.provider] ?? [];
          return (
            <Card key={provider.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{provider.label}</CardTitle>
                    <CardDescription>{provider.provider}</CardDescription>
                  </div>
                  <Badge tone={toneForSync(provider.lastSyncStatus)}>{provider.lastSyncStatus ?? "idle"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Label</Label>
                    <Input value={draft.label} onChange={(event) => setProviderDraft(provider.provider, { label: event.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Base URL</Label>
                    <Input value={draft.baseUrl} onChange={(event) => setProviderDraft(provider.provider, { baseUrl: event.target.value })} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    placeholder={provider.apiKeyMasked ?? "Paste a new API key"}
                    value={draft.apiKey}
                    onChange={(event) => setProviderDraft(provider.provider, { apiKey: event.target.value })}
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" onClick={() => handleSaveProvider(provider.provider)} disabled={busyKey !== null}>Save</Button>
                  <Button variant="secondary" onClick={() => handleValidateProvider(provider.provider)} disabled={busyKey !== null}>Validate</Button>
                  <Button onClick={() => handleSyncProvider(provider.provider)} disabled={busyKey !== null}>Fetch Models</Button>
                </div>
                {provider.lastSyncError ? <Notice tone="warning" title="Last sync error" description={provider.lastSyncError} /> : null}
                <div className="rounded-lg border border-border">
                  <div className="grid grid-cols-[1.3fr,1fr,auto] gap-3 border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Model</span>
                    <span>Family</span>
                    <span>Status</span>
                  </div>
                  <div className="max-h-64 overflow-auto">
                    {models.map((model) => (
                      <div key={model.id} className="grid grid-cols-[1.3fr,1fr,auto] gap-3 px-4 py-3 text-sm border-b last:border-b-0 border-border">
                        <div>
                          <p className="font-medium">{model.displayName}</p>
                          <p className="text-xs text-muted-foreground">{model.modelId}</p>
                        </div>
                        <span>{model.family ?? "-"}</span>
                        <Badge tone={model.isSelectable ? "success" : "warning"}>{model.isSelectable ? "selectable" : "limited"}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <CardTitle>Writing Model Bindings</CardTitle>
              <CardDescription>Choose the exact AI model used by each writing runtime step.</CardDescription>
            </div>
            <Badge tone="info">{writingUseCases.length} active roles</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {writingUseCases.map(renderUseCaseBinding)}
          {writingUseCases.length === 0 ? (
            <Notice tone="warning" title="Writing bindings are missing" description="Sync or seed AI settings so writing grader, improver, roast, and image-summary bindings can be configured." />
          ) : null}
        </CardContent>
      </Card>

      {otherUseCases.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Other Model Bindings</CardTitle>
            <CardDescription>Non-writing runtime bindings. Admin chat is hidden because the workspace chat was removed.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {otherUseCases.map(renderUseCaseBinding)}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Writing Prompt Profiles</CardTitle>
            <CardDescription>All writing prompt keys are visible here. Save as draft, then publish to make them live.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr,1fr,1fr,auto]">
              <Input value={newProfileDraft.slug} onChange={(event) => setNewProfileDraft((current) => ({ ...current, slug: event.target.value }))} placeholder="slug" />
              <Input value={newProfileDraft.title} onChange={(event) => setNewProfileDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Title" />
              <Select value={newProfileDraft.taskTypeScope} onChange={(event) => setNewProfileDraft((current) => ({ ...current, taskTypeScope: event.target.value as WritingTaskTypeScope }))}>
                <option value="all">All</option>
                <option value="task_1">Task 1</option>
                <option value="task_2">Task 2</option>
              </Select>
              <Button onClick={handleCreateProfile} disabled={busyKey !== null}>New Draft</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-[280px,1fr]">
              <div className="space-y-2">
                {profiles.map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`w-full rounded-lg border px-3 py-3 text-left ${selectedProfile?.id === profile.id ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">{profile.title}</p>
                      <Badge tone={profile.isActive ? "success" : "neutral"}>{profile.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{profile.slug} v{profile.version}</p>
                  </button>
                ))}
              </div>
              {selectedProfile ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input value={selectedProfile.title} onChange={(event) => setProfiles((current) => current.map((item) => item.id === selectedProfile.id ? { ...item, title: event.target.value } : item))} />
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input value={selectedProfile.description ?? ""} onChange={(event) => setProfiles((current) => current.map((item) => item.id === selectedProfile.id ? { ...item, description: event.target.value } : item))} />
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    Showing {selectedProfileEntries.length}/{PROMPT_KEYS.length} writing prompts for this profile.
                  </div>
                  {selectedProfileEntries.map((entry) => (
                    <div key={entry.key} className="space-y-2 rounded-xl border border-border p-3">
                      <div className="space-y-1">
                        <Label>{PROMPT_LABELS[entry.key].title}</Label>
                        <p className="text-xs text-muted-foreground">{entry.key} · {PROMPT_LABELS[entry.key].description}</p>
                      </div>
                      <Textarea
                        value={entry.body}
                        rows={PROMPT_LABELS[entry.key].rows}
                        onChange={(event) => updateSelectedPromptEntry(entry.key, event.target.value)}
                      />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={handleSaveProfile} disabled={busyKey !== null}>Save Draft</Button>
                    <Button onClick={handlePublishProfile} disabled={busyKey !== null}>Publish</Button>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Render the active prompts against a sample essay.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={previewDraft.taskType} onChange={(event) => setPreviewDraft((current) => ({ ...current, taskType: event.target.value as WritingTaskTypeScope }))}>
                <option value="task_1">Task 1</option>
                <option value="task_2">Task 2</option>
              </Select>
              <Textarea value={previewDraft.taskPromptText} onChange={(event) => setPreviewDraft((current) => ({ ...current, taskPromptText: event.target.value }))} rows={4} />
              <Textarea value={previewDraft.essayText} onChange={(event) => setPreviewDraft((current) => ({ ...current, essayText: event.target.value }))} rows={6} />
              <Button onClick={handlePreview} disabled={busyKey !== null}>Render Preview</Button>
              {preview ? (
                <div className="space-y-3">
                  <Textarea readOnly value={preview.graderSystem} rows={8} />
                  <Textarea readOnly value={preview.graderUser} rows={8} />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Rubrics + Anchors</CardTitle>
              <CardDescription>Published supporting assets currently loaded by the writing runtime.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                {rubrics.map((rubric) => (
                  <div key={rubric.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span>{rubric.taskTypeScope} rubric v{rubric.version}</span>
                    <Badge tone={rubric.isActive ? "success" : "neutral"}>{rubric.status}</Badge>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {anchorSets.map((anchorSet) => (
                  <div key={anchorSet.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                    <span>{anchorSet.taskTypeScope} anchors v{anchorSet.version} ({anchorSet.items.length} items)</span>
                    <Badge tone={anchorSet.isActive ? "success" : "neutral"}>{anchorSet.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Audit Trail</CardTitle>
              <CardDescription>Recent publishing and config edits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {auditEntries.slice(0, 12).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border px-3 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{entry.entityType}</span>
                    <Badge tone="neutral">{entry.action}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{entry.createdAt}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
