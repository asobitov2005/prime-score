"use client";
import type { BaseScope } from "./base";
import type { Part1Scope } from "./controller-part-01";
import { AdminAiSettingsLoadingSkeleton, AdminAiUseCaseBinding, Badge, Button, Label, Select, Textarea, adminApi } from "../dependencies";
import { PROMPT_KEYS, SPEAKING_EXAMINER_PROMPT_FIELDS, USE_CASE_LABELS, parseSettingsDraft, readNestedString, writeNestedString } from "../shared";

export function useControllerPart2(scope: BaseScope & Part1Scope) {
  const { providers, modelsByProvider, setUseCases, useCaseSettingsDrafts, setUseCaseSettingsDrafts, setProfiles, setSelectedProfileId, setPreview, setNotice, loading, busyKey, setBusyKey, previewDraft, newProfileDraft, selectedProfile, handleUseCaseChange } = scope;
  async function handleUseCaseSettingsSave(binding: AdminAiUseCaseBinding) {
      if (!binding.providerConfigId || !binding.providerModelId) return;
      setBusyKey(`usecase-settings-${binding.useCase}`);
      try {
        const settingsJson = JSON.parse(useCaseSettingsDrafts[binding.useCase] ?? "{}") as Record<string, unknown>;
        const nextBinding = await adminApi.updateAiUseCase(binding.useCase, {
          providerConfigId: binding.providerConfigId,
          providerModelId: binding.providerModelId,
          settingsJson,
        });
        setUseCases((current) => current.map((item) => (item.useCase === binding.useCase ? nextBinding : item)));
        setUseCaseSettingsDrafts((current) => ({
          ...current,
          [binding.useCase]: JSON.stringify(nextBinding.settingsJson ?? {}, null, 2),
        }));
        setNotice({ tone: "success", title: "Settings saved", description: `${USE_CASE_LABELS[binding.useCase].title} settings were updated.` });
      } catch (error) {
        setNotice({ tone: "warning", title: "Settings save failed", description: error instanceof Error ? error.message : "Settings JSON is invalid." });
      } finally {
        setBusyKey(null);
      }
    }

  function updateSpeakingPromptDraft(binding: AdminAiUseCaseBinding, path: readonly string[], value: string) {
      const currentSettings = parseSettingsDraft(useCaseSettingsDrafts[binding.useCase], binding.settingsJson ?? {});
      const nextSettings = writeNestedString(currentSettings, path, value);
      setUseCaseSettingsDrafts((current) => ({
        ...current,
        [binding.useCase]: JSON.stringify(nextSettings, null, 2),
      }));
    }

  function renderSpeakingExaminerPromptEditor(binding: AdminAiUseCaseBinding) {
      const settings = parseSettingsDraft(useCaseSettingsDrafts[binding.useCase], binding.settingsJson ?? {});
  
      return (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex flex-col gap-1">
            <p className="text-sm font-semibold text-foreground">Speaking examiner prompts</p>
            <p className="text-xs leading-5 text-muted-foreground">
              These fields control the live Gemini examiner for strict exam, free talk, Uzbek roast, and part-specific behavior.
            </p>
          </div>
          <div className="mt-4 grid gap-4">
            {SPEAKING_EXAMINER_PROMPT_FIELDS.map((field) => (
              <div key={field.path.join(".")} className="space-y-2">
                <div>
                  <Label>{field.label}</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{field.description}</p>
                </div>
                <Textarea
                  value={readNestedString(settings, field.path)}
                  rows={field.rows}
                  className="font-mono text-xs"
                  onChange={(event) => updateSpeakingPromptDraft(binding, field.path, event.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      );
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
                  void handleUseCaseChange(binding.useCase, nextProvider.id, nextModel.id, binding.settingsJson);
                }
              }}>
                {providers.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Select value={modelId} onChange={(event) => activeProvider && void handleUseCaseChange(binding.useCase, activeProvider.id, event.target.value, binding.settingsJson)}>
                {models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}
              </Select>
            </div>
          </div>
          {binding.useCase.startsWith("speaking_") ? (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {binding.useCase === "speaking_examiner" ? renderSpeakingExaminerPromptEditor(binding) : null}
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Label>Prompt, cache, and budget settings JSON</Label>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    Keep long reusable instructions here so runtime can cache stable prompts and avoid unnecessary repeated model calls.
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => void handleUseCaseSettingsSave(binding)}
                  disabled={busyKey !== null || !binding.providerConfigId || !binding.providerModelId}
                >
                  Save Settings
                </Button>
              </div>
              <Textarea
                value={useCaseSettingsDrafts[binding.useCase] ?? JSON.stringify(binding.settingsJson ?? {}, null, 2)}
                rows={binding.useCase === "speaking_grader" ? 10 : 8}
                className="font-mono text-xs"
                onChange={(event) => setUseCaseSettingsDrafts((current) => ({
                  ...current,
                  [binding.useCase]: event.target.value,
                }))}
              />
            </div>
          ) : null}
        </div>
      );
    }

  if (loading) {
      return <AdminAiSettingsLoadingSkeleton />;
    }

  return { handleUseCaseSettingsSave, updateSpeakingPromptDraft, renderSpeakingExaminerPromptEditor, handleCreateProfile, handleSaveProfile, handlePublishProfile, handlePreview, renderUseCaseBinding };
}

export type Part2Scope = ReturnType<typeof useControllerPart2>;
